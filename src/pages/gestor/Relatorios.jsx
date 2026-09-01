import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { generateWeeklyReportPDF } from '../../lib/pdfReport';
import { FileText, Download, RefreshCw, Loader2, Calendar, Users, AlertTriangle, Clock } from 'lucide-react';

// Retorna segunda-feira da semana atual
function getMonday(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0=dom, 1=seg...6=sab
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getSunday(monday) {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function toISODate(d) {
  return d.toISOString().split('T')[0];
}

const STATUS_BADGE = {
  available: { bg: '#f0fdf4', color: '#065f46', label: 'Disponível' },
  expired: { bg: '#f3f4f6', color: '#6b7280', label: 'Expirado' },
  error: { bg: '#fef2f2', color: '#991b1b', label: 'Erro' },
};

export default function Relatorios() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, schools(name)')
      .eq('id', user.id)
      .single();

    if (!profile?.school_id) { setLoading(false); return; }

    setSchoolId(profile.school_id);
    setSchoolName(profile.schools?.name || 'Escola');
    await fetchReports(profile.school_id);
  };

  const fetchReports = async (sid) => {
    setLoading(true);
    // Marcar expirados no cliente também
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('school_id', sid)
      .order('generated_at', { ascending: false })
      .limit(20);

    if (!error) {
      // Atualiza status local dos expirados
      const now = new Date();
      const updated = (data || []).map(r => ({
        ...r,
        status: r.status === 'available' && new Date(r.expires_at) < now ? 'expired' : r.status
      }));
      setReports(updated);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!schoolId) return;

    const monday = getMonday();
    const sunday = getSunday(monday);
    const startStr = toISODate(monday);
    const endStr = toISODate(sunday);

    // Verificar se já existe relatório para esta semana
    const existing = reports.find(r => r.period_start === startStr && r.status === 'available');
    if (existing) {
      showToast('Já existe um relatório disponível para esta semana.', 'error');
      return;
    }

    setGenerating(true);
    try {
      // 1. Buscar ocorrências da semana com todos os joins necessários
      const { data: incidents, error: incErr } = await supabase
        .from('incidents')
        .select(`
          id, student_id, teacher_id, class_id, class_name,
          incident_date, incident_date_only, incident_time,
          subject, incident_types_list, outros_description, description,
          students(id, name, enrollment, guardian_name, guardian_phone,
            class_students(class_id, classes(name))
          ),
          profiles(name),
          communications(message)
        `)
        .eq('school_id', schoolId)
        .gte('incident_date_only', startStr)
        .lte('incident_date_only', endStr)
        .order('student_id')
        .order('incident_date');

      if (incErr) throw incErr;

      if (!incidents || incidents.length === 0) {
        showToast('Nenhuma ocorrência encontrada para esta semana.', 'error');
        setGenerating(false);
        return;
      }

      // 2. Calcular totais
      const studentIds = [...new Set(incidents.map(i => i.student_id))];
      const totalStudents = studentIds.length;
      const totalIncidents = incidents.length;

      // 3. Gerar PDF — ANTES de qualquer operação no banco
      const pdfBytes = await generateWeeklyReportPDF({
        schoolName,
        periodStart: fmtDate(monday),
        periodEnd: fmtDate(sunday),
        incidents,
      });

      if (!pdfBytes || pdfBytes.length === 0) throw new Error('PDF gerado vazio');

      // 4. Upload para Supabase Storage
      const fileName = `${schoolId}/Relatorio_${startStr}_a_${endStr}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 5. Verificar acessibilidade do arquivo
      const { data: fileCheck } = await supabase.storage
        .from('reports')
        .list(schoolId + '/');

      const uploaded = fileCheck?.find(f => f.name === `Relatorio_${startStr}_a_${endStr}.pdf`);
      if (!uploaded) throw new Error('Arquivo não encontrado no Storage após upload');

      // 6. Salvar metadados no banco (somente após confirmar upload)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: reportRow, error: reportErr } = await supabase
        .from('reports')
        .insert({
          school_id: schoolId,
          period_start: startStr,
          period_end: endStr,
          total_students: totalStudents,
          total_incidents: totalIncidents,
          file_path: fileName,
          generated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'available',
        })
        .select()
        .single();

      if (reportErr) throw reportErr;

      showToast(`Relatório gerado: ${totalIncidents} ocorrência(s) de ${totalStudents} aluno(s).`);
      setReports(prev => [reportRow, ...prev]);

    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      showToast('Erro ao gerar relatório: ' + err.message + ' — Nenhum dado foi alterado.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    if (report.status !== 'available') {
      showToast('Este relatório está expirado e não pode mais ser baixado.', 'error');
      return;
    }
    if (new Date(report.expires_at) < new Date()) {
      showToast('Este relatório expirou.', 'error');
      return;
    }

    setDownloadingId(report.id);
    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .download(report.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      const fileName = `Relatorio_Ocorrencias_${report.period_start}_a_${report.period_end}.pdf`;
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Erro ao baixar PDF: ' + err.message, 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCleanupExpired = async () => {
    // Deletar arquivos expirados do Storage e atualizar DB
    const expired = reports.filter(r => r.status === 'expired' || new Date(r.expires_at) < new Date());
    for (const r of expired) {
      if (r.file_path) {
        await supabase.storage.from('reports').remove([r.file_path]);
      }
      await supabase.from('reports').update({ status: 'expired' }).eq('id', r.id);
    }
    await fetchReports(schoolId);
    if (expired.length > 0) showToast(`${expired.length} relatório(s) expirado(s) limpos.`);
  };

  const monday = getMonday();
  const sunday = getSunday(monday);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 4px 0' }}>Relatórios Semanais</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            PDFs ficam disponíveis por 7 dias após geração
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => fetchReports(schoolId)}
            disabled={loading}
            style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}
          >
            <RefreshCw size={14} /> Atualizar
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', opacity: generating ? 0.75 : 1 }}
          >
            {generating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={16} />}
            {generating ? 'Gerando PDF...' : 'Gerar Relatório Semanal'}
          </button>
        </div>
      </div>

      {/* Card da semana atual */}
      <div style={{ backgroundColor: '#fdf2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Calendar size={20} color="#9b1c26" />
        <div>
          <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>Semana Atual</div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>{fmtDate(monday)} até {fmtDate(sunday)}</div>
        </div>
      </div>

      {/* Lista de relatórios */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
        </div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: '#6b7280' }}>
          <FileText size={48} color="#d1d5db" style={{ marginBottom: '12px' }} />
          <p style={{ fontWeight: '500', margin: '0 0 4px 0' }}>Nenhum relatório gerado ainda.</p>
          <p style={{ fontSize: '13px', margin: 0 }}>Clique em "Gerar Relatório Semanal" para criar o primeiro.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reports.map(report => {
            const isExpired = report.status === 'expired' || new Date(report.expires_at) < new Date();
            const badge = isExpired ? STATUS_BADGE.expired : STATUS_BADGE[report.status] || STATUS_BADGE.available;
            const daysLeft = Math.max(0, Math.ceil((new Date(report.expires_at) - new Date()) / (1000 * 60 * 60 * 24)));

            return (
              <div key={report.id} style={{
                background: '#fff', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                border: `1px solid ${isExpired ? '#e5e7eb' : '#fecaca'}`,
                padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
                opacity: isExpired ? 0.7 : 1
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <FileText size={20} color={isExpired ? '#9ca3af' : '#9b1c26'} />
                    <div>
                      <div style={{ fontWeight: '700', color: '#111827', fontSize: '15px' }}>RELATÓRIO SEMANAL</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {fmtDate(report.period_start + 'T12:00')} — {fmtDate(report.period_end + 'T12:00')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginLeft: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#374151' }}>
                      <Users size={13} /> {report.total_students} aluno(s)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#374151' }}>
                      <AlertTriangle size={13} /> {report.total_incidents} ocorrência(s)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#6b7280' }}>
                      <Clock size={13} /> Gerado em: {fmtDate(report.generated_at)}
                    </div>
                  </div>

                  <div style={{ marginLeft: '30px', marginTop: '6px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    {!isExpired && (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        Expira em: {fmtDate(report.expires_at + '')} ({daysLeft} dia{daysLeft !== 1 ? 's' : ''})
                      </span>
                    )}
                    {isExpired && (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>Disponível até: {fmtDate(report.expires_at + '')}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(report)}
                  disabled={isExpired || downloadingId === report.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 18px', backgroundColor: isExpired ? '#e5e7eb' : '#9b1c26',
                    color: isExpired ? '#9ca3af' : 'white',
                    border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px',
                    cursor: isExpired ? 'not-allowed' : 'pointer'
                  }}
                >
                  {downloadingId === report.id
                    ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Download size={15} />}
                  {downloadingId === report.id ? 'Baixando...' : 'BAIXAR PDF'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

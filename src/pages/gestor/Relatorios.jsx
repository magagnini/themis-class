import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { generateWeeklyReportPDF } from '../../lib/pdfReport';
import { FileText, Download, RefreshCw, Loader2, Calendar, Users, AlertTriangle, Clock, User } from 'lucide-react';

function getMonday(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); 
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

  // Estados para Relatório Individual
  const [showIndividualForm, setShowIndividualForm] = useState(false);
  const [indStart, setIndStart] = useState(toISODate(getMonday()));
  const [indEnd, setIndEnd] = useState(toISODate(getSunday(getMonday())));
  const [classes, setClasses] = useState([]);
  const [indClassId, setIndClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [indStudentId, setIndStudentId] = useState('');

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
    const { data, error } = await supabase
      .from('reports')
      .select('*, students(name)')
      .eq('school_id', sid)
      .order('generated_at', { ascending: false })
      .limit(30);

    if (!error) {
      const now = new Date();
      const updated = (data || []).map(r => ({
        ...r,
        status: r.status === 'available' && new Date(r.expires_at) < now ? 'expired' : r.status
      }));
      setReports(updated);
    }
    setLoading(false);
  };

  const fetchClasses = async () => {
    if (!schoolId || classes.length > 0) return;
    const { data } = await supabase.from('classes').select('id, name').eq('school_id', schoolId).eq('active', true).order('name');
    setClasses(data || []);
  };

  const handleClassChange = async (classId) => {
    setIndClassId(classId);
    setIndStudentId('');
    setStudents([]);
    if (!classId) return;

    setLoadingStudents(true);
    const { data } = await supabase
      .from('class_students')
      .select('student_id, students(id, name)')
      .eq('class_id', classId);
    
    const mapped = (data || []).map(cs => cs.students).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
    setStudents(mapped);
    setLoadingStudents(false);
  };

  const handleGenerateGeneral = async () => {
    if (!schoolId) return;

    const monday = getMonday();
    const sunday = getSunday(monday);
    const startStr = toISODate(monday);
    const endStr = toISODate(sunday);

    const existing = reports.find(r => r.period_start === startStr && r.report_type === 'general' && r.status === 'available');
    if (existing) {
      showToast('Já existe um relatório geral disponível para esta semana.', 'error');
      return;
    }

    setGenerating(true);
    try {
      const { data: incidents, error: incErr } = await supabase
        .from('incidents')
        .select(`
          id, student_id, teacher_id, class_id, class_name,
          incident_date, incident_date_only, incident_time,
          subject, incident_types_list, outros_description, description, student_age,
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

      const studentIds = [...new Set(incidents.map(i => i.student_id))];
      const totalStudents = studentIds.length;
      const totalIncidents = incidents.length;

      const pdfBytes = await generateWeeklyReportPDF({
        schoolName,
        periodStart: fmtDate(monday),
        periodEnd: fmtDate(sunday),
        incidents,
        reportType: 'general'
      });

      if (!pdfBytes || pdfBytes.length === 0) throw new Error('PDF gerado vazio');

      const fileName = `${schoolId}/Relatorio_Geral_${startStr}_a_${endStr}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true });

      if (uploadError) throw uploadError;

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
          report_type: 'general'
        })
        .select('*, students(name)')
        .single();

      if (reportErr) throw reportErr;

      showToast(`Relatório gerado: ${totalIncidents} ocorrência(s) de ${totalStudents} aluno(s).`);
      setReports(prev => [reportRow, ...prev]);

    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar relatório: ' + err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateIndividual = async () => {
    if (!schoolId) return;
    if (!indStart || !indEnd) return showToast('Selecione o período.', 'error');
    if (!indStudentId) return showToast('Selecione um aluno.', 'error');

    if (new Date(indStart) > new Date(indEnd)) {
      return showToast('A data inicial deve ser menor ou igual a data final.', 'error');
    }

    setGenerating(true);
    try {
      const { data: incidents, error: incErr } = await supabase
        .from('incidents')
        .select(`
          id, student_id, teacher_id, class_id, class_name,
          incident_date, incident_date_only, incident_time,
          subject, incident_types_list, outros_description, description, student_age,
          students(id, name, enrollment, guardian_name, guardian_phone,
            class_students(class_id, classes(name))
          ),
          profiles(name),
          communications(message)
        `)
        .eq('school_id', schoolId)
        .eq('student_id', indStudentId)
        .gte('incident_date_only', indStart)
        .lte('incident_date_only', indEnd)
        .order('incident_date');

      if (incErr) throw incErr;

      if (!incidents || incidents.length === 0) {
        showToast('Nenhuma ocorrência encontrada para este aluno no período.', 'error');
        setGenerating(false);
        return;
      }

      const totalIncidents = incidents.length;
      const studentName = incidents[0].students?.name || 'Aluno';

      const pdfBytes = await generateWeeklyReportPDF({
        schoolName,
        periodStart: fmtDate(indStart + 'T12:00'),
        periodEnd: fmtDate(indEnd + 'T12:00'),
        incidents,
        reportType: 'individual'
      });

      if (!pdfBytes || pdfBytes.length === 0) throw new Error('PDF gerado vazio');

      const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${schoolId}/Relatorio_${safeName}_${indStart}_a_${indEnd}_${Date.now()}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true });

      if (uploadError) throw uploadError;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: reportRow, error: reportErr } = await supabase
        .from('reports')
        .insert({
          school_id: schoolId,
          student_id: indStudentId,
          period_start: indStart,
          period_end: indEnd,
          total_students: 1,
          total_incidents: totalIncidents,
          file_path: fileName,
          generated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'available',
          report_type: 'individual'
        })
        .select('*, students(name)')
        .single();

      if (reportErr) throw reportErr;

      showToast(`Relatório individual gerado: ${totalIncidents} ocorrência(s).`);
      setReports(prev => [reportRow, ...prev]);
      setShowIndividualForm(false);

    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar relatório individual: ' + err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    if (report.status !== 'available' || new Date(report.expires_at) < new Date()) {
      return showToast('Este relatório está expirado e não pode mais ser baixado.', 'error');
    }

    setDownloadingId(report.id);
    try {
      const { data, error } = await supabase.storage.from('reports').download(report.file_path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      
      let fileName = '';
      if (report.report_type === 'individual' && report.students?.name) {
        const safeName = report.students.name.replace(/[^a-zA-Z0-9]/g, '_');
        fileName = `Relatorio_${safeName}_${report.period_start}_a_${report.period_end}.pdf`;
      } else {
        fileName = `Relatorio_Geral_Ocorrencias_${report.period_start}_a_${report.period_end}.pdf`;
      }
      
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

  const monday = getMonday();
  const sunday = getSunday(monday);
  
  const inpStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 4px 0' }}>Relatórios</h1>
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
        </div>
      </div>

      {/* Ações de Geração */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={handleGenerateGeneral}
          disabled={generating}
          style={{ padding: '12px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', opacity: generating ? 0.75 : 1 }}
        >
          {generating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={16} />}
          GERAR RELATÓRIO SEMANAL GERAL
        </button>

        <button
          onClick={() => {
            fetchClasses();
            setShowIndividualForm(!showIndividualForm);
          }}
          style={{ padding: '12px 20px', backgroundColor: showIndividualForm ? '#f3f4f6' : '#fff', color: '#111827', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
        >
          <User size={16} />
          GERAR RELATÓRIO INDIVIDUAL POR ALUNO
        </button>
      </div>

      {showIndividualForm && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#111827' }}>Gerar Relatório Individual</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Data Inicial</label>
              <input type="date" style={inpStyle} value={indStart} onChange={e => setIndStart(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Data Final</label>
              <input type="date" style={inpStyle} value={indEnd} onChange={e => setIndEnd(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Turma</label>
              <select style={inpStyle} value={indClassId} onChange={e => handleClassChange(e.target.value)}>
                <option value="">Selecione a turma...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Aluno</label>
              <select style={inpStyle} value={indStudentId} onChange={e => setIndStudentId(e.target.value)} disabled={!indClassId || loadingStudents}>
                <option value="">{loadingStudents ? 'Carregando...' : 'Selecione o aluno...'}</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateIndividual}
            disabled={generating || !indStudentId}
            style={{ padding: '12px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: generating || !indStudentId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', opacity: generating || !indStudentId ? 0.75 : 1 }}
          >
            {generating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={16} />}
            GERAR RELATÓRIO DO ALUNO
          </button>
        </div>
      )}

      {/* Lista de relatórios */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
        </div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: '#6b7280' }}>
          <FileText size={48} color="#d1d5db" style={{ marginBottom: '12px' }} />
          <p style={{ fontWeight: '500', margin: '0 0 4px 0' }}>Nenhum relatório gerado ainda.</p>
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
                    {report.report_type === 'individual' ? <User size={20} color={isExpired ? '#9ca3af' : '#1d4ed8'} /> : <FileText size={20} color={isExpired ? '#9ca3af' : '#9b1c26'} />}
                    <div>
                      <div style={{ fontWeight: '700', color: '#111827', fontSize: '15px' }}>
                        {report.report_type === 'individual' 
                          ? `RELATÓRIO INDIVIDUAL — ${report.students?.name?.toUpperCase() || 'ALUNO'}` 
                          : 'RELATÓRIO SEMANAL GERAL'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {fmtDate(report.period_start + 'T12:00')} — {fmtDate(report.period_end + 'T12:00')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginLeft: '30px' }}>
                    {report.report_type === 'general' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#374151' }}>
                        <Users size={13} /> {report.total_students} aluno(s)
                      </div>
                    )}
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
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(report)}
                  disabled={isExpired || downloadingId === report.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 18px', backgroundColor: isExpired ? '#e5e7eb' : (report.report_type === 'individual' ? '#1d4ed8' : '#9b1c26'),
                    color: isExpired ? '#9ca3af' : 'white',
                    border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px',
                    cursor: isExpired ? 'not-allowed' : 'pointer'
                  }}
                >
                  {downloadingId === report.id
                    ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Download size={15} />}
                  BAIXAR PDF
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

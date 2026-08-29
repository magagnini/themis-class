import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { MessageSquare, Phone, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';

const STATUS_LABEL = { pending: 'Pendente', sent: 'Enviada' };
const STATUS_COLOR = { pending: '#fef3c7', sent: '#f0fdf4' };
const STATUS_TEXT = { pending: '#92400e', sent: '#065f46' };

function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return '55' + digits;
  if (digits.length === 10) return '55' + digits;
  if (digits.length === 13 && digits.startsWith('55')) return digits;
  return '55' + digits;
}

function buildWhatsappMessage({ studentName, types, subject, date, time, teacher, outrosText }) {
  const hasOutros = types?.some(t => t.id === 'outros');
  const tiposNormais = (types || []).filter(t => t.id !== 'outros').map(t => t.label).join(', ');
  const dateFormatted = date ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR') : '';

  if (hasOutros && !tiposNormais) {
    return `Bom dia! Gostaríamos de informar que o(a) aluno(a) ${studentName} recebeu uma ocorrência. Motivo: ${outrosText}. Aula de ${subject} no dia ${dateFormatted} às ${time}. Professor(a): ${teacher}.`;
  }
  return `Bom dia! Gostaríamos de informar que o(a) aluno(a) ${studentName} recebeu uma ocorrência referente a: ${tiposNormais}${hasOutros ? `. Observação: ${outrosText}` : ''}. Aula de ${subject} no dia ${dateFormatted} às ${time}. Professor(a): ${teacher}.`;
}

export default function Comunicacoes() {
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchComms(); }, []);

  const fetchComms = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', userData.user.id).single();
    if (!profile?.school_id) return;

    const { data, error } = await supabase
      .from('communications')
      .select('*')
      .eq('school_id', profile.school_id)
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    setComms(data || []);
    setLoading(false);
  };

  const markAsSent = async (commId) => {
    const { error } = await supabase
      .from('communications')
      .update({ status: 'sent', whatsapp_sent_at: new Date().toISOString() })
      .eq('id', commId);
    if (!error) {
      setComms(prev => prev.map(c => c.id === commId ? { ...c, status: 'sent', whatsapp_sent_at: new Date().toISOString() } : c));
      showToast('Comunicação marcada como enviada!');
    }
  };

  const handleWhatsapp = (comm) => {
    const phone = formatPhone(comm.guardian_phone || comm.recipient_contact);
    if (!phone || phone.length < 12) {
      showToast('Número do responsável inválido ou não cadastrado.', 'error');
      return;
    }

    const msg = buildWhatsappMessage({
      studentName: comm.student_name || comm.recipient_name || 'Aluno',
      types: comm.incident_types_list || [],
      subject: comm.subject || '',
      date: comm.incident_date_only || (comm.created_at?.split('T')[0]),
      time: comm.incident_time || '',
      teacher: comm.teacher_name || 'Professor(a)',
      outrosText: comm.outros_description || '',
    });

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    markAsSent(comm.id);
  };

  const pendingCount = comms.filter(c => c.status === 'pending').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 4px 0' }}>Comunicações</h1>
          {pendingCount > 0 && (
            <span style={{ fontSize: '13px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: '20px', fontWeight: '600' }}>
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
      ) : comms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <MessageSquare size={48} color="#d1d5db" style={{ marginBottom: '12px' }} />
          <p style={{ margin: 0, fontWeight: '500' }}>Nenhuma comunicação pendente.</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>As ocorrências registradas pelos professores aparecerão aqui.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {comms.map(comm => {
            const phone = formatPhone(comm.guardian_phone || comm.recipient_contact);
            const hasPhone = phone && phone.length >= 12;
            const types = comm.incident_types_list || [];
            const dateFormatted = comm.incident_date_only
              ? new Date(comm.incident_date_only + 'T12:00:00').toLocaleDateString('pt-BR')
              : comm.created_at ? new Date(comm.created_at).toLocaleDateString('pt-BR') : '—';

            return (
              <div key={comm.id} style={{
                backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: `1px solid ${comm.status === 'sent' ? '#bbf7d0' : '#e5e7eb'}`,
                overflow: 'hidden'
              }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#111827', fontWeight: '700' }}>
                      {comm.student_name || 'Aluno'}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {comm.class_name && <span>Turma: <strong>{comm.class_name}</strong></span>}
                      {comm.teacher_name && <span>Prof: <strong>{comm.teacher_name}</strong></span>}
                      {comm.subject && <span>Disciplina: <strong>{comm.subject}</strong></span>}
                      <span>Data: <strong>{dateFormatted}</strong></span>
                      {comm.incident_time && <span>Horário: <strong>{comm.incident_time}</strong></span>}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                    backgroundColor: STATUS_COLOR[comm.status] || STATUS_COLOR.pending,
                    color: STATUS_TEXT[comm.status] || STATUS_TEXT.pending
                  }}>
                    {comm.status === 'sent' ? <CheckCircle size={12} style={{ marginRight: '4px' }} /> : <Clock size={12} style={{ marginRight: '4px' }} />}
                    {STATUS_LABEL[comm.status] || 'Pendente'}
                  </span>
                </div>

                {/* Ocorrências */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ocorrência(s)</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {types.length === 0
                      ? <span style={{ fontSize: '13px', color: '#6b7280' }}>{comm.message?.substring(0, 80) || '—'}</span>
                      : types.map((t, i) => (
                        <span key={i} style={{ padding: '4px 10px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                          {t.label}
                        </span>
                      ))
                    }
                  </div>
                  {comm.outros_description && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#4b5563', fontStyle: 'italic' }}>
                      Obs: {comm.outros_description}
                    </p>
                  )}
                </div>

                {/* Responsável + Botão */}
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Responsável</p>
                    {hasPhone ? (
                      <p style={{ margin: 0, fontSize: '14px', color: '#111827', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} color="#9b1c26" />
                        {comm.guardian_phone || comm.recipient_contact}
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={14} /> Número não cadastrado
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleWhatsapp(comm)}
                    disabled={!hasPhone}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 20px', backgroundColor: hasPhone ? '#25D366' : '#d1d5db',
                      color: 'white', border: 'none', borderRadius: '8px',
                      fontWeight: '700', fontSize: '14px', cursor: hasPhone ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <MessageSquare size={18} />
                    ENVIAR PELO WHATSAPP
                  </button>
                </div>

                {comm.status === 'sent' && comm.whatsapp_sent_at && (
                  <div style={{ padding: '8px 20px', backgroundColor: '#f0fdf4', fontSize: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} />
                    Enviado em {new Date(comm.whatsapp_sent_at).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

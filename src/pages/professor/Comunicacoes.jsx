import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Clock, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

const STATUS_LABEL = { pending: 'Pendente', sent: 'Enviada' };
const STATUS_COLOR = { pending: '#fef3c7', sent: '#f0fdf4' };
const STATUS_TEXT = { pending: '#92400e', sent: '#065f46' };

export default function ComunicacoesProfessor() {
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchComms(); }, []);

  const fetchComms = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, name')
      .eq('id', userData.user.id)
      .single();

    if (!profile?.school_id) { setLoading(false); return; }

    // 1. Buscar incidentes do professor
    const { data: incidents } = await supabase
      .from('incidents')
      .select('id')
      .eq('teacher_id', userData.user.id);

    const myIncidentIds = new Set((incidents || []).map(i => i.id));
    const myNameLower = (profile.name || '').trim().toLowerCase();

    // 2. Buscar comunicações da escola
    const { data: allComms, error: commsErr } = await supabase
      .from('communications')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false });

    if (commsErr) {
      console.error(commsErr);
    }

    // 3. Filtrar comunicações: aquelas vinculadas aos incidentes do professor OU cujo teacher_name coincida
    const filtered = (allComms || []).filter(c => {
      if (c.incident_id && myIncidentIds.has(c.incident_id)) return true;
      if (c.teacher_name && c.teacher_name.trim().toLowerCase() === myNameLower) return true;
      return false;
    });

    setComms(filtered);
    setLoading(false);
  };

  const pendingCount = comms.filter(c => c.status === 'pending').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 4px 0' }}>Comunicações</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            Acompanhe o status de envio aos responsáveis das ocorrências que você registrou.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {pendingCount > 0 && (
            <span style={{ fontSize: '13px', backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={fetchComms}
            disabled={loading}
            style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}
          >
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
        </div>
      ) : comms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <MessageSquare size={48} color="#d1d5db" style={{ marginBottom: '12px' }} />
          <p style={{ margin: 0, fontWeight: '500' }}>Nenhuma comunicação encontrada para suas ocorrências.</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Assim que você registrar ocorrências na aba FAZER OC, elas aparecerão aqui.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {comms.map(comm => {
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
                {/* Header do Card */}
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
                    color: STATUS_TEXT[comm.status] || STATUS_TEXT.pending,
                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }}>
                    {comm.status === 'sent' ? <CheckCircle size={13} /> : <Clock size={13} />}
                    {STATUS_LABEL[comm.status] || 'Pendente'}
                  </span>
                </div>

                {/* Ocorrências */}
                <div style={{ padding: '16px 20px' }}>
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

                {comm.status === 'sent' && comm.whatsapp_sent_at && (
                  <div style={{ padding: '10px 20px', backgroundColor: '#f0fdf4', fontSize: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid #bbf7d0' }}>
                    <CheckCircle size={14} />
                    Notificação enviada pela gestão em {new Date(comm.whatsapp_sent_at).toLocaleString('pt-BR')}
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

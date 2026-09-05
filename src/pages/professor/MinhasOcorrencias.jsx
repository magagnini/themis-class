import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, Clock, CheckCircle, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

const STATUS_LABEL = { pending: 'Pendente', sent: 'Enviada', in_progress: 'Em Acompanhamento', resolved: 'Resolvida' };
const STATUS_COLOR = { pending: '#fef3c7', sent: '#f0fdf4', in_progress: '#eff6ff', resolved: '#f0fdf4' };
const STATUS_TEXT = { pending: '#92400e', sent: '#065f46', in_progress: '#1e40af', resolved: '#065f46' };

export default function MinhasOcorrencias() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, name')
      .eq('id', userData.user.id)
      .single();

    if (!profile?.school_id) { setLoading(false); return; }

    // Buscar ocorrências registradas pelo professor
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        students ( id, name ),
        profiles ( name ),
        communications ( id, status, whatsapp_sent_at )
      `)
      .eq('school_id', profile.school_id)
      .eq('teacher_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    }

    setIncidents(data || []);
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 4px 0' }}>Minhas Ocorrências</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            Histórico de todas as ocorrências que você registrou na escola.
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          disabled={loading}
          style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
        </div>
      ) : incidents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <BookOpen size={48} color="#d1d5db" style={{ marginBottom: '12px' }} />
          <p style={{ margin: 0, fontWeight: '500' }}>Nenhuma ocorrência registrada por você ainda.</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Use o menu "FAZER OC" para registrar sua primeira ocorrência.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {incidents.map(inc => {
            const types = inc.incident_types_list || [];
            const comm = inc.communications?.[0] || null;
            const commStatus = comm?.status || inc.status || 'pending';
            const studentName = inc.students?.name || 'Aluno';
            const dateFormatted = inc.incident_date_only
              ? new Date(inc.incident_date_only + 'T12:00:00').toLocaleDateString('pt-BR')
              : inc.incident_date ? new Date(inc.incident_date).toLocaleDateString('pt-BR') : '—';

            return (
              <div key={inc.id} style={{
                backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: `1px solid ${commStatus === 'sent' ? '#bbf7d0' : '#e5e7eb'}`,
                overflow: 'hidden'
              }}>
                {/* Header do Card */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      {inc.incident_number && (
                        <span style={{ backgroundColor: '#fdf2f2', color: '#9b1c26', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>
                          Nº {inc.incident_number}
                        </span>
                      )}
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#111827', fontWeight: '700' }}>
                        {studentName} {inc.student_age ? `(${inc.student_age} anos)` : ''}
                      </h3>
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {inc.class_name && <span>Turma: <strong>{inc.class_name}</strong></span>}
                      {inc.subject && <span>Disciplina: <strong>{inc.subject}</strong></span>}
                      <span>Data: <strong>{dateFormatted}</strong></span>
                      {inc.incident_time && <span>Horário: <strong>{inc.incident_time}</strong></span>}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                    backgroundColor: STATUS_COLOR[commStatus] || STATUS_COLOR.pending,
                    color: STATUS_TEXT[commStatus] || STATUS_TEXT.pending,
                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }}>
                    {commStatus === 'sent' ? <CheckCircle size={13} /> : <Clock size={13} />}
                    {STATUS_LABEL[commStatus] || 'Pendente'}
                  </span>
                </div>

                {/* Ocorrências */}
                <div style={{ padding: '16px 20px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ocorrência(s)</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {types.length === 0
                      ? <span style={{ fontSize: '13px', color: '#6b7280' }}>{inc.description || '—'}</span>
                      : types.map((t, i) => (
                        <span key={i} style={{ padding: '4px 10px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                          {t.label}
                        </span>
                      ))
                    }
                  </div>
                  {inc.outros_description && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#4b5563', fontStyle: 'italic' }}>
                      Obs: {inc.outros_description}
                    </p>
                  )}
                </div>

                {comm?.status === 'sent' && comm.whatsapp_sent_at && (
                  <div style={{ padding: '10px 20px', backgroundColor: '#f0fdf4', fontSize: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid #bbf7d0' }}>
                    <CheckCircle size={14} />
                    Notificação enviada aos responsáveis em {new Date(comm.whatsapp_sent_at).toLocaleString('pt-BR')}
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

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { MessageSquare, Clock, CheckCircle, Loader2 } from 'lucide-react';

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
    if (!userData?.user) return;

    // Buscar comunicações associadas às ocorrências relatadas por este professor
    const { data: incidents, error: incError } = await supabase
      .from('incidents')
      .select(`
        id, 
        communications (
          id, status, created_at, student_name, recipient_name, subject, 
          incident_types_list, outros_description, incident_date_only, incident_time
        )
      `)
      .eq('teacher_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (incError) {
      console.error(incError);
      setLoading(false);
      return;
    }

    // Extrair as comunicações dos incidentes
    let allComms = [];
    incidents.forEach(inc => {
      if (inc.communications && inc.communications.length > 0) {
        allComms.push(...inc.communications);
      }
    });

    // Ordenar pela data de criação
    allComms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setComms(allComms);
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 4px 0' }}>Minhas Comunicações</h1>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
          Acompanhe o status de envio das ocorrências registradas por você.
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {comms.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            <MessageSquare size={48} color="#d1d5db" style={{ marginBottom: '12px' }} />
            <p>Nenhuma comunicação encontrada para suas ocorrências.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Data</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Aluno</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Motivo</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status de Envio</th>
              </tr>
            </thead>
            <tbody>
              {comms.map(comm => {
                const isSent = comm.status === 'sent';
                const dateStr = new Date(comm.created_at).toLocaleDateString('pt-BR');
                
                const tipos = (comm.incident_types_list || []).map(t => t.label).join(', ');
                const outros = comm.outros_description;
                const motivo = tipos ? (outros ? `${tipos} (Obs: ${outros})` : tipos) : (outros || 'Ocorrência');

                return (
                  <tr key={comm.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{dateStr}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                      {comm.student_name || 'Aluno'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '14px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {motivo}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        backgroundColor: STATUS_COLOR[comm.status], 
                        color: STATUS_TEXT[comm.status], 
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' 
                      }}>
                        {isSent ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {STATUS_LABEL[comm.status] || 'Desconhecido'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

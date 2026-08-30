import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Loader2, Plus, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Ocorrencias() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidents')
        .select(`*, students(name), classes(name), incident_types(name), profiles(name)`)
        .order('incident_date', { ascending: false });
      
      if (!error && data) setIncidents(data);
      setLoading(false);
    };
    fetchIncidents();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: 0 }}>Ocorrências</h1>
        <Link to="/gestor/fazer-oc" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#9b1c26', color: 'white', textDecoration: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: '600', fontSize: '14px' }}>
          <Plus size={18} /> FAZER OC
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Data', 'Aluno', 'Turma', 'Ocorrência(s)', 'Gravidade', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Nenhuma ocorrência registrada.</td></tr>
              ) : incidents.map(inc => {
                const types = inc.incident_types_list || [];
                return (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', color: '#374151', fontSize: '14px' }}>
                      {inc.incident_date_only ? new Date(inc.incident_date_only + 'T12:00:00').toLocaleDateString('pt-BR') : new Date(inc.incident_date).toLocaleDateString('pt-BR')}
                      {inc.incident_time && <div style={{ fontSize: '12px', color: '#6b7280' }}>{inc.incident_time}</div>}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>{inc.students?.name || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{inc.classes?.name || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px' }}>
                      {types.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {types.map((t, i) => (
                            <span key={i} style={{ backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>
                              {t.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        inc.incident_types?.name || inc.description || '—'
                      )}
                      {inc.outros_description && (
                        <div style={{ fontSize: '11px', color: '#4b5563', fontStyle: 'italic', marginTop: '2px' }}>
                          Obs: {inc.outros_description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}><Badge type={inc.severity} /></td>
                    <td style={{ padding: '14px 16px' }}><Badge type={inc.status} /></td>
                    <td style={{ padding: '14px 16px' }}>
                      <button style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}>
                        <FileText size={14} /> Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

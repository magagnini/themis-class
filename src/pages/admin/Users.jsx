import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';
import { Loader2 } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*, schools(name)')
        .order('created_at', { ascending: false });
      setUsers(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const roleLabel = { admin: 'Administrador', gestor: 'Gestor', professor: 'Professor', coordenador: 'Coordenador' };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#111827', margin: '0 0 1.5rem 0' }}>Usuários da Plataforma</h1>
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Nome', 'E-mail', 'Cargo', 'Escola', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>{u.name || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{u.email || '—'}</td>
                  <td style={{ padding: '14px 16px' }}><Badge type={u.role === 'admin' ? 'high' : u.role === 'gestor' ? 'medium' : 'default'}>{roleLabel[u.role] || u.role}</Badge></td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{u.schools?.name || '(Plataforma)'}</td>
                  <td style={{ padding: '14px 16px' }}><Badge type={u.active !== false ? 'active' : 'inactive'}>{u.active !== false ? 'Ativo' : 'Inativo'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

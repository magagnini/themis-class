import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { School, CheckCircle, XCircle, Users, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: schools }, { count: users }] = await Promise.all([
        supabase.from('schools').select('status'),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      ]);
      setStats({
        total: schools?.length || 0,
        active: schools?.filter(s => s.status === 'active').length || 0,
        blocked: schools?.filter(s => s.status !== 'active').length || 0,
        users: users || 0
      });
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { label: 'Total de Escolas', value: stats.total, icon: <School size={22} />, color: '#9b1c26' },
    { label: 'Escolas Ativas', value: stats.active, icon: <CheckCircle size={22} />, color: '#059669' },
    { label: 'Bloqueadas/Suspensas', value: stats.blocked, icon: <XCircle size={22} />, color: '#ef4444' },
    { label: 'Total de Usuários', value: stats.users, icon: <Users size={22} />, color: '#3b82f6' },
  ];

  if (loading) return (
    <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#111827', margin: '0 0 6px 0' }}>Painel Administrativo</h1>
      <p style={{ color: '#6b7280', margin: '0 0 2rem 0' }}>Visão geral da plataforma Themis Class.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '2rem' }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: '#fff', padding: '20px 24px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ padding: '14px', backgroundColor: `${c.color}18`, color: c.color, borderRadius: '10px' }}>
              {c.icon}
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{c.label}</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#111827' }}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#374151' }}>Acesso Rápido</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/admin/escolas" style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Gerenciar Escolas</a>
          <a href="/admin/usuarios" style={{ padding: '10px 20px', border: '1px solid #d1d5db', color: '#374151', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Ver Usuários</a>
        </div>
      </div>
    </div>
  );
}

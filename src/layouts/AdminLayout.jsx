import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, School, Users, Settings, LogOut } from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
    { path: '/admin/escolas', label: 'Escolas', icon: <School size={19} /> },
    { path: '/admin/usuarios', label: 'Usuários', icon: <Users size={19} /> },
    { path: '/admin/configuracoes', label: 'Configurações', icon: <Settings size={19} /> },
  ];

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <aside style={{
        width: '260px', backgroundColor: '#fff',
        borderRight: '1px solid #e5e7eb', display: 'flex',
        flexDirection: 'column', position: 'fixed', height: '100vh', overflowY: 'auto', zIndex: 10
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ color: '#9b1c26', margin: '0 0 2px 0', fontSize: '1.4rem', fontWeight: '700' }}>Themis Class</h2>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>Painel Administrativo</p>
        </div>

        <nav style={{ flex: 1, padding: '0.5rem 0' }}>
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.7rem 1.25rem',
                color: isActive(item.path) ? '#9b1c26' : '#4b5563',
                backgroundColor: isActive(item.path) ? '#fdf2f2' : 'transparent',
                borderRight: `3px solid ${isActive(item.path) ? '#9b1c26' : 'transparent'}`,
                textDecoration: 'none', fontWeight: isActive(item.path) ? '600' : '400',
                fontSize: '14px', transition: 'background-color 0.15s'
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.75rem', background: 'none',
            border: 'none', color: '#ef4444', cursor: 'pointer',
            fontWeight: '500', fontSize: '14px', borderRadius: '6px'
          }}>
            <LogOut size={19} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '260px' }}>
        <header style={{
          height: '60px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 2rem', position: 'sticky', top: 0, zIndex: 9
        }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#9b1c26', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
            A
          </div>
        </header>
        <div style={{ padding: '2rem', flex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

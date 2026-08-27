import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Settings, 
  LogOut,
  Bell,
  MessageSquare
} from 'lucide-react';

export default function GestorLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/gestor', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/gestor/ocorrencias', label: 'Ocorrências', icon: <AlertTriangle size={20} /> },
    { path: '/gestor/alunos', label: 'Alunos', icon: <Users size={20} /> },
    { path: '/gestor/professores', label: 'Professores', icon: <GraduationCap size={20} /> },
    { path: '/gestor/turmas', label: 'Turmas', icon: <BookOpen size={20} /> },
    { path: '/gestor/tipos-ocorrencia', label: 'Tipos de Ocorrência', icon: <Settings size={20} /> },
    { path: '/gestor/comunicacoes', label: 'Comunicações', icon: <MessageSquare size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '260px', 
        backgroundColor: '#fff', 
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.5rem' }}>Themis Class</h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Gestão Escolar</p>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {menuItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/gestor' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  color: isActive ? 'var(--primary)' : '#4b5563',
                  backgroundColor: isActive ? '#fdf2f2' : 'transparent',
                  borderRight: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                  textDecoration: 'none',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'background-color 0.2s'
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: '500',
              textAlign: 'left'
            }}
          >
            <LogOut size={20} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ 
          height: '64px', 
          backgroundColor: '#fff', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 2rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
              <Bell size={20} color="#4b5563" />
              <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
            </button>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              G
            </div>
          </div>
        </header>

        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { ToastContainer } from './components/ui/Toast';
import './index.css';

import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminSchools from './pages/admin/Schools';
import AdminUsers from './pages/admin/Users';
import AdminSchoolDetails from './pages/admin/SchoolDetails';
import AdminOcorrencias from './pages/admin/Ocorrencias';
import GestorLayout from './layouts/GestorLayout';
import GestorDashboard from './pages/gestor/Dashboard';
import Ocorrencias from './pages/gestor/Ocorrencias';
import NovaOcorrencia from './pages/gestor/NovaOcorrencia';
import Alunos from './pages/gestor/Alunos';
import Professores from './pages/gestor/Professores';
import Turmas from './pages/gestor/Turmas';
import TiposOcorrencia from './pages/gestor/TiposOcorrencia';
import Comunicacoes from './pages/gestor/Comunicacoes';
import Relatorios from './pages/gestor/Relatorios';
import Configuracoes from './pages/gestor/Configuracoes';

import ProfessorLayout from './layouts/ProfessorLayout';
import ProfessorDashboard from './pages/professor/Dashboard';
import ProfNovaOcorrencia from './pages/professor/NovaOcorrencia';
import ProfessorComunicacoes from './pages/professor/Comunicacoes';

// Carregando global com spinner vinho - sem texto "Carregando" que ficava parecendo tela branca
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      gap: '16px'
    }}>
      <div style={{
        width: '44px', height: '44px',
        border: '4px solid #fecaca',
        borderTopColor: '#9b1c26',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: '#9b1c26', fontWeight: '600', fontSize: '15px', margin: 0 }}>Themis Class</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ProtectedRoute robusto: usa onAuthStateChange para reagir instantaneamente à sessão
function ProtectedRoute({ children, allowedRoles }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'denied'
  const [role, setRole] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth(session) {
      if (!session) {
        if (!cancelled) setStatus('denied');
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (cancelled) return;

        const userRole = data?.role || session.user.user_metadata?.role;
        setRole(userRole);

        if (allowedRoles && !allowedRoles.includes(userRole)) {
          setStatus('denied');
        } else {
          setStatus('ok');
        }
      } catch {
        if (!cancelled) setStatus('denied');
      }
    }

    // 1. Verificar sessão atual imediatamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAuth(session);
    });

    // 2. Ouvir mudanças de auth (login/logout) para reagir sem precisar recarregar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAuth(session);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [allowedRoles?.join(',')]);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'denied') return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="escolas" element={<AdminSchools />} />
          <Route path="escolas/:id" element={<AdminSchoolDetails />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="ocorrencias" element={<AdminOcorrencias />} />
          <Route path="configuracoes" element={<div>Configurações da Plataforma em breve</div>} />
        </Route>
        
        {/* Gestor Routes */}
        <Route path="/gestor" element={<ProtectedRoute allowedRoles={['gestor', 'admin']}><GestorLayout /></ProtectedRoute>}>
          <Route index element={<GestorDashboard />} />
          <Route path="ocorrencias" element={<Ocorrencias />} />
          <Route path="fazer-oc" element={<ProfNovaOcorrencia />} />
          <Route path="alunos" element={<Alunos />} />
          <Route path="professores" element={<Professores />} />
          <Route path="turmas" element={<Turmas />} />
          <Route path="comunicacoes" element={<Comunicacoes />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>

        {/* Professor Routes */}
        <Route path="/professor" element={<ProtectedRoute allowedRoles={['professor']}><ProfessorLayout /></ProtectedRoute>}>
          <Route index element={<ProfessorDashboard />} />
          <Route path="nova-ocorrencia" element={<ProfNovaOcorrencia />} />
          <Route path="comunicacoes" element={<ProfessorComunicacoes />} />
          <Route path="alunos" element={<Turmas />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

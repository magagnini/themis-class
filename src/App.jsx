import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { getCachedProfile, setCachedProfile, clearCachedProfile } from './lib/userCache';
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
import ProfMinhasOcorrencias from './pages/professor/MinhasOcorrencias';
import ProfessorComunicacoes from './pages/professor/Comunicacoes';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f3f4f6', gap: '16px'
    }}>
      <div style={{
        width: '44px', height: '44px',
        border: '4px solid #fecaca',
        borderTopColor: '#9b1c26',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: '#9b1c26', fontWeight: '600', fontSize: '15px', margin: 0 }} translate="no">Themis Class</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ProtectedRoute otimizado: usa cache sessionStorage para evitar query ao banco a cada navegação
function ProtectedRoute({ children, allowedRoles }) {
  const [status, setStatus] = useState(() => {
    // Verificação síncrona do cache ANTES do primeiro render — elimina o flash de loading
    const cached = getCachedProfile();
    if (cached && allowedRoles && !allowedRoles.includes(cached.role)) return 'denied';
    if (cached) return 'ok';
    return 'loading';
  });

  const checkedRef = useRef(false);

  useEffect(() => {
    if (status !== 'loading') return; // já resolvido via cache
    if (checkedRef.current) return;
    checkedRef.current = true;

    let cancelled = false;

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) { clearCachedProfile(); setStatus('denied'); }
        return;
      }

      // Verificar cache novamente (pode ter sido preenchido por outro ProtectedRoute)
      const cached = getCachedProfile();
      if (cached) {
        if (!cancelled) {
          const ok = !allowedRoles || allowedRoles.includes(cached.role);
          setStatus(ok ? 'ok' : 'denied');
        }
        return;
      }

      // Buscar do banco apenas se necessário
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email, role, school_id, active')
        .eq('id', session.user.id)
        .single();

      if (cancelled) return;

      if (!profile) { setStatus('denied'); return; }

      setCachedProfile(profile);
      const ok = !allowedRoles || allowedRoles.includes(profile.role);
      setStatus(ok ? 'ok' : 'denied');
    }

    checkAuth();

    // Limpar cache no logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearCachedProfile();
        setStatus('denied');
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

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
          <Route path="configuracoes" element={<div style={{padding:'2rem'}}>Configurações da Plataforma em breve</div>} />
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
          <Route path="ocorrencias" element={<ProfMinhasOcorrencias />} />
          <Route path="comunicacoes" element={<ProfessorComunicacoes />} />
          <Route path="alunos" element={<div style={{padding:'2rem'}}>Alunos em breve</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

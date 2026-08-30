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
import ProfMinhasOcorrencias from './pages/professor/MinhasOcorrencias';

function ProtectedRoute({ children, allowedRoles }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setRole(data?.role);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (!session) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" />;

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
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
          <Route path="ocorrencias" element={<ProfMinhasOcorrencias />} />
          <Route path="alunos" element={<div>Alunos em breve</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

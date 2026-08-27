import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import './index.css';

import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import GestorPanel from './pages/GestorPanel';
import GestorLayout from './layouts/GestorLayout';
import Dashboard from './pages/gestor/Dashboard';
import ProfessorPanel from './pages/ProfessorPanel';

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
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" />; // Pode redirecionar para uma pág. Não Autorizado

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        } />
        
        {/* Gestor Routes */}
        <Route path="/gestor" element={
          <ProtectedRoute allowedRoles={['gestor', 'admin']}>
            <GestorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="ocorrencias" element={<div>Ocorrências em breve</div>} />
          <Route path="alunos" element={<div>Alunos em breve</div>} />
          <Route path="professores" element={<div>Professores em breve</div>} />
          <Route path="turmas" element={<div>Turmas em breve</div>} />
          <Route path="tipos-ocorrencia" element={<div>Tipos de Ocorrência em breve</div>} />
          <Route path="comunicacoes" element={<div>Comunicações em breve</div>} />
        </Route>

        <Route path="/professor" element={
          <ProtectedRoute allowedRoles={['professor']}>
            <ProfessorPanel />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

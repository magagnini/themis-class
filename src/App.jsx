import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import './index.css';

import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import GestorPanel from './pages/GestorPanel';
import ProfessorPanel from './pages/ProfessorPanel';

function Home() {
  return (
    <div className="home-container">
      <h1 style={{ color: 'var(--primary)' }}>Themis Class</h1>
      <p>Bem-vindo ao portal da escola.</p>
      <Link to="/login" className="btn">Entrar</Link>
    </div>
  );
}

// Componente para proteger rotas baseado no auth e role
function ProtectedRoute({ children, allowedRole }) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile && profile.role === allowedRole) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
    setLoading(false);
  };

  if (loading) return <div>Carregando...</div>;
  if (!isAuthorized) return <Navigate to="/login" />;

  return children;
}

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          } />
          
          <Route path="/gestor/*" element={
            <ProtectedRoute allowedRole="gestor">
              <GestorPanel />
            </ProtectedRoute>
          } />
          
          <Route path="/professor/*" element={
            <ProtectedRoute allowedRole="professor">
              <ProfessorPanel />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

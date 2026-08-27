import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function GestorPanel() {
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    // Graças ao RLS (Row Level Security), o gestor só verá as ocorrências da sua própria escola
    const { data, error } = await supabase
      .from('incidents')
      .select('*, students(name), incident_types(name)')
      .order('date', { ascending: false });
      
    if (!error && data) {
      setIncidents(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2>Painel do Gestor Escolar</h2>
        <button onClick={handleLogout} className="btn" style={{ width: 'auto' }}>Sair</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
        <aside style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <ul style={{ listStyle: 'none', lineHeight: '2' }}>
            <li><strong>Dashboard</strong></li>
            <li>Ocorrências</li>
            <li>Alunos</li>
            <li>Professores</li>
            <li>Turmas</li>
            <li>Tipos de Ocorrência</li>
          </ul>
        </aside>
        
        <main style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Últimas Ocorrências</h3>
          <p>Você está visualizando apenas os dados isolados da sua escola.</p>
          
          <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Data</th>
                <th>Aluno</th>
                <th>Tipo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length > 0 ? (
                incidents.map(inc => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem' }}>{new Date(inc.date).toLocaleDateString()}</td>
                    <td>{inc.students?.name}</td>
                    <td>{inc.incident_types?.name}</td>
                    <td>{inc.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '1rem', textAlign: 'center' }}>
                    Nenhuma ocorrência registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}

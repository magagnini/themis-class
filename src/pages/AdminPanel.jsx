import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const [schools, setSchools] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data, error } = await supabase.from('schools').select('*');
    if (!error && data) {
      setSchools(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2>Painel Administrativo da Plataforma</h2>
        <button onClick={handleLogout} className="btn" style={{ width: 'auto' }}>Sair</button>
      </header>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}>
        <h3>Escolas Cadastradas</h3>
        <p>Apenas o ADM tem acesso a todas as escolas.</p>
        
        <ul style={{ marginTop: '1rem', listStyle: 'none' }}>
          {schools.length > 0 ? (
            schools.map(school => (
              <li key={school.id} style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                <strong>{school.name}</strong> - CNPJ: {school.cnpj}
              </li>
            ))
          ) : (
            <p>Nenhuma escola cadastrada ainda.</p>
          )}
        </ul>
        
        <button className="btn" style={{ marginTop: '1rem', width: 'auto' }}>+ Cadastrar Nova Escola</button>
      </div>
    </div>
  );
}

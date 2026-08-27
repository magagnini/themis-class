import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ProfessorPanel() {
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyIncidents();
  }, []);

  const fetchMyIncidents = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Busca ocorrências registradas por este professor
    const { data, error } = await supabase
      .from('incidents')
      .select('*, students(name), incident_types(name)')
      .eq('teacher_id', userData.user.id)
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
    <div style={{ padding: '2rem', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2>Painel do Professor</h2>
        <button onClick={handleLogout} className="btn" style={{ width: 'auto' }}>Sair</button>
      </header>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>Registrar Nova Ocorrência</h3>
        <p>Interface simples para registro rápido em sala de aula.</p>
        
        <form style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }} onSubmit={(e) => e.preventDefault()}>
          <div>
            <label>Aluno</label>
            <select style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">Selecione o aluno...</option>
              {/* Opções viriam do banco */}
            </select>
          </div>
          <div>
            <label>Tipo de Ocorrência</label>
            <select style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">Selecione o tipo...</option>
              {/* Opções viriam do banco */}
            </select>
          </div>
          <div>
            <label>Descrição</label>
            <textarea 
              rows="4" 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              placeholder="Descreva o que aconteceu..."
            ></textarea>
          </div>
          <button type="button" className="btn">Registrar Ocorrência e Notificar Responsável</button>
        </form>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}>
        <h3>Minhas Ocorrências Recentes</h3>
        <ul style={{ marginTop: '1rem', listStyle: 'none' }}>
          {incidents.length > 0 ? (
            incidents.map(inc => (
              <li key={inc.id} style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                <strong>{inc.students?.name}</strong> - {inc.incident_types?.name} 
                <span style={{ float: 'right', color: '#666' }}>{new Date(inc.date).toLocaleDateString()}</span>
              </li>
            ))
          ) : (
            <p>Você ainda não registrou nenhuma ocorrência.</p>
          )}
        </ul>
      </div>
    </div>
  );
}

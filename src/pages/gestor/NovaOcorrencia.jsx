import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../components/ui/Toast';

export default function NovaOcorrencia() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#111827' }}>Registrar Nova Ocorrência</h1>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <p style={{ color: '#6b7280' }}>Página de criação de nova ocorrência em desenvolvimento. Aqui haverá um formulário completo e otimizado.</p>
        <button onClick={() => navigate('/gestor/ocorrencias')} style={{ marginTop: '1rem', padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
          Voltar
        </button>
      </div>
    </div>
  );
}

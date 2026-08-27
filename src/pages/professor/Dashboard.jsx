import { Link } from 'react-router-dom';
import { PlusCircle, List } from 'lucide-react';

export default function ProfessorDashboard() {
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#111827' }}>Olá, Professor!</h1>
      <p style={{ color: '#6b7280', margin: '0 0 2rem 0' }}>Bem-vindo ao portal. O que deseja fazer hoje?</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <Link to="/professor/nova-ocorrencia" style={{ background: '#9b1c26', color: 'white', padding: '2rem', borderRadius: '12px', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <PlusCircle size={48} />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Registrar Nova Ocorrência</h2>
        </Link>
        <Link to="/professor/ocorrencias" style={{ background: '#fff', color: '#374151', padding: '2rem', borderRadius: '12px', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
          <List size={48} color="#6b7280" />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Minhas Ocorrências</h2>
        </Link>
      </div>
    </div>
  );
}

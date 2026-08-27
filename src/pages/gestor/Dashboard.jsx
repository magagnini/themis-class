export default function Dashboard() {
  const stats = [
    { label: 'Ocorrências Hoje', value: 12, color: '#ef4444' },
    { label: 'Ocorrências no Mês', value: 87, color: '#f59e0b' },
    { label: 'Alunos Envolvidos', value: 42, color: '#3b82f6' },
    { label: 'Ocorrências Graves', value: 5, color: '#9b1c26' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#111827' }}>Dashboard da Escola</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ color: '#6b7280', margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>{stat.label}</p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '300px' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#374151' }}>Evolução de Ocorrências (Exemplo)</h3>
          <div style={{ height: '200px', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            [Gráfico de Linha]
          </div>
        </div>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '300px' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#374151' }}>Por Gravidade</h3>
          <div style={{ height: '200px', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            [Gráfico de Pizza]
          </div>
        </div>
      </div>
    </div>
  );
}

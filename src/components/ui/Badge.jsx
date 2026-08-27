// Badge component
export function Badge({ children, type = 'default' }) {
  const styles = {
    pending:     { bg: '#fef3c7', color: '#92400e', label: 'Pendente' },
    in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'Em acompanhamento' },
    resolved:    { bg: '#d1fae5', color: '#065f46', label: 'Resolvida' },
    low:         { bg: '#d1fae5', color: '#065f46', label: 'Baixa' },
    medium:      { bg: '#fef3c7', color: '#92400e', label: 'Média' },
    high:        { bg: '#fee2e2', color: '#991b1b', label: 'Alta' },
    active:      { bg: '#d1fae5', color: '#065f46', label: 'Ativo' },
    inactive:    { bg: '#f3f4f6', color: '#6b7280', label: 'Inativo' },
    blocked:     { bg: '#fee2e2', color: '#991b1b', label: 'Bloqueada' },
    suspended:   { bg: '#fef3c7', color: '#92400e', label: 'Suspensa' },
    default:     { bg: '#f3f4f6', color: '#374151', label: children },
  };
  const s = styles[type] || styles.default;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: s.bg,
      color: s.color,
      whiteSpace: 'nowrap'
    }}>
      {children || s.label}
    </span>
  );
}

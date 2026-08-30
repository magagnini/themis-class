import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Users, ChevronDown, ChevronRight } from 'lucide-react';

export default function Turmas() {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => { fetchTurmas(); }, []);

  const fetchTurmas = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', userData.user.id)
      .single();

    if (!profile?.school_id) return;

    // Buscar turmas da escola com alunos vinculados
    const { data: classesData, error } = await supabase
      .from('classes')
      .select(`
        id, name, active,
        class_students(
          student_id,
          students(id, name, enrollment, status)
        )
      `)
      .eq('school_id', profile.school_id)
      .order('name');

    if (!error && classesData) {
      setTurmas(classesData);
      // Expandir todas por padrão
      const exp = {};
      classesData.forEach(t => { exp[t.id] = true; });
      setExpanded(exp);
    }
    setLoading(false);
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: 0 }}>Turmas</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>
          {turmas.length} turma(s) cadastradas. As turmas são criadas automaticamente ao cadastrar ou importar alunos.
        </p>
      </div>

      {turmas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <Users size={48} color="#d1d5db" style={{ marginBottom: '12px' }} />
          <p style={{ fontWeight: '500', margin: '0 0 4px 0' }}>Nenhuma turma cadastrada.</p>
          <p style={{ margin: 0, fontSize: '13px' }}>Cadastre ou importe alunos na aba <strong>Alunos</strong> informando a turma — ela será criada automaticamente.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {turmas.map(turma => {
            const alunos = turma.class_students?.map(cs => cs.students).filter(Boolean) || [];
            const isOpen = expanded[turma.id];
            return (
              <div key={turma.id} style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => toggleExpand(turma.id)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isOpen ? <ChevronDown size={20} color="#9b1c26" /> : <ChevronRight size={20} color="#6b7280" />}
                    <span style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>{turma.name}</span>
                    <span style={{ backgroundColor: '#fdf2f2', color: '#9b1c26', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: '600' }}>
                      {alunos.length} aluno{alunos.length !== 1 ? 's' : ''}
                    </span>
                    {!turma.active && (
                      <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', borderRadius: '20px', padding: '2px 10px', fontSize: '11px' }}>Inativa</span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #f3f4f6', padding: '0 0 8px 0' }}>
                    {alunos.length === 0 ? (
                      <p style={{ padding: '12px 52px', color: '#9ca3af', fontSize: '13px', margin: 0 }}>Nenhum aluno vinculado a esta turma.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#fafafa' }}>
                            <th style={{ padding: '8px 52px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Nome</th>
                            <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Matrícula</th>
                            <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alunos.map(aluno => (
                            <tr key={aluno.id} style={{ borderTop: '1px solid #f9fafb' }}>
                              <td style={{ padding: '10px 52px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{aluno.name}</td>
                              <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{aluno.enrollment || '—'}</td>
                              <td style={{ padding: '10px 16px', fontSize: '13px' }}>
                                <span style={{ backgroundColor: aluno.status === 'active' ? '#f0fdf4' : '#f9fafb', color: aluno.status === 'active' ? '#15803d' : '#6b7280', padding: '2px 8px', borderRadius: '20px', fontWeight: '600', fontSize: '11px' }}>
                                  {aluno.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

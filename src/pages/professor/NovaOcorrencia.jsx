import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { CheckSquare, Square, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

const INCIDENT_TYPES_DEFAULT = [
  { id: 'celular', label: 'Uso indevido de celular', msg: 'recebeu uma ocorrência referente a uso indevido de celular durante a aula' },
  { id: 'tarefas', label: 'Não realizou as tarefas', msg: 'não realizou as atividades/tarefas solicitadas' },
  { id: 'atraso', label: 'Atraso', msg: 'chegou após o início da aula' },
  { id: 'material', label: 'Falta de material escolar', msg: 'veio à aula sem os materiais necessários' },
  { id: 'conversas', label: 'Conversas excessivas durante a aula', msg: 'apresentou conversas excessivas durante a aula, prejudicando o andamento' },
  { id: 'desrespeito_prof', label: 'Desrespeito ao professor', msg: 'apresentou comportamento desrespeitoso ao professor' },
  { id: 'desrespeito_col', label: 'Desrespeito aos colegas', msg: 'apresentou comportamento desrespeitoso com os colegas' },
  { id: 'comportamento', label: 'Comportamento inadequado', msg: 'apresentou comportamento inadequado para o ambiente escolar' },
  { id: 'atividades', label: 'Não participou das atividades', msg: 'se recusou ou se omitiu das atividades propostas' },
  { id: 'outros', label: 'Outros', msg: '' },
];

export default function FazerOC() {
  const [schoolId, setSchoolId] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [professorsList, setProfessorsList] = useState([]);
  const [students, setStudents] = useState([]);
  const [hasMinRequirements, setHasMinRequirements] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    student_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    subject: '',
  });
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [outrosText, setOutrosText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, name')
      .eq('id', userData.user.id)
      .single();

    setSchoolId(profile.school_id);
    const isGestorOrAdmin = profile.role === 'gestor' || profile.role === 'admin';
    setTeacherName(profile.name || (isGestorOrAdmin ? 'Gestor' : 'Professor'));

    // Buscar professores da escola para permitir seleção caso seja gestor
    const { data: profsData, count: profCount } = await supabase
      .from('profiles')
      .select('id, name', { count: 'exact' })
      .eq('school_id', profile.school_id)
      .eq('role', 'professor')
      .order('name');

    setProfessorsList(profsData || []);

    const { data: studentsData } = await supabase
      .from('students')
      .select('id, name, guardian_name, guardian_phone, class_students(class_id, classes(name))')
      .eq('school_id', profile.school_id)
      .eq('status', 'active')
      .order('name');

    setStudents(studentsData || []);
    
    // Regra: precisa ter pelo menos 1 aluno cadastrado
    // e caso seja professor, precisa estar logado; se for gestor, pode registrar
    setHasMinRequirements((studentsData || []).length > 0);
    setLoading(false);
  };


  const toggleType = (typeId) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) return prev.filter(t => t !== typeId);
      if (prev.length >= 4) {
        showToast('Máximo de 4 ocorrências por registro.', 'error');
        return prev;
      }
      return [...prev, typeId];
    });
  };

  const handleSubmit = async () => {
    if (!form.student_id) return showToast('Selecione um aluno.', 'error');
    if (!form.date) return showToast('Informe a data.', 'error');
    if (!form.time) return showToast('Informe o horário.', 'error');
    if (!form.subject.trim()) return showToast('Informe a disciplina.', 'error');
    if (selectedTypes.length === 0) return showToast('Selecione pelo menos 1 ocorrência.', 'error');
    if (selectedTypes.includes('outros') && !outrosText.trim()) return showToast('Descreva a ocorrência "Outros".', 'error');
    if (outrosText.length > 500) return showToast('O campo "Outros" ultrapassou 500 caracteres.', 'error');

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const student = students.find(s => s.id === form.student_id);
      const className = student?.class_students?.[0]?.classes?.name || '';

      const typesListForDB = selectedTypes.map(id => {
        const t = INCIDENT_TYPES_DEFAULT.find(x => x.id === id);
        return { id, label: t?.label || id };
      });

      // 1. Criar o incident
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          school_id: schoolId,
          student_id: form.student_id,
          teacher_id: userData.user.id,
          incident_date: new Date(form.date + 'T' + form.time).toISOString(),
          incident_date_only: form.date,
          incident_time: form.time,
          subject: form.subject,
          incident_types_list: typesListForDB,
          outros_description: selectedTypes.includes('outros') ? outrosText : null,
          status: 'pending',
          severity: 'low',
          description: typesListForDB.map(t => t.label).join(', '),
        })
        .select()
        .single();

      if (incidentError) throw incidentError;

      // 2. Criar a comunicação para o gestor
      const guardianPhone = student?.guardian_phone || '';
      const typesLabels = typesListForDB.map(t => t.label).join(', ');
      const dateFormatted = new Date(form.date + 'T12:00:00').toLocaleDateString('pt-BR');

      const { error: commError } = await supabase
        .from('communications')
        .insert({
          school_id: schoolId,
          incident_id: incident.id,
          student_id: form.student_id,
          channel: 'whatsapp',
          recipient_name: student?.guardian_name || 'Responsável',
          recipient_contact: guardianPhone,
          status: 'pending',
          // campos extras
          incident_id_ref: incident.id,
          teacher_name: teacherName,
          subject: form.subject,
          incident_time: form.time,
          incident_types_list: typesListForDB,
          outros_description: selectedTypes.includes('outros') ? outrosText : null,
          student_name: student?.name || '',
          guardian_phone: guardianPhone,
          class_name: className,
          message: buildMessage({
            studentName: student?.name || '',
            types: typesListForDB,
            subject: form.subject,
            date: dateFormatted,
            time: form.time,
            teacher: teacherName,
            outrosText: selectedTypes.includes('outros') ? outrosText : null,
          }),
        });

      if (commError) console.error('Erro ao criar comunicação:', commError);

      setSuccess(true);
      setForm({ student_id: '', date: new Date().toISOString().split('T')[0], time: '', subject: '' });
      setSelectedTypes([]);
      setOutrosText('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar ocorrência: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const buildMessage = ({ studentName, types, subject, date, time, teacher, outrosText }) => {
    const hasOutros = types.some(t => t.id === 'outros');
    const tiposNormais = types.filter(t => t.id !== 'outros').map(t => t.label).join(', ');

    if (hasOutros && tiposNormais.length === 0) {
      return `Bom dia! Gostaríamos de informar que o(a) aluno(a) ${studentName} recebeu uma ocorrência. Motivo: ${outrosText}. Aula de ${subject} no dia ${date} às ${time}. Professor(a): ${teacher}.`;
    }
    const parte = tiposNormais || outrosText;
    return `Bom dia! Gostaríamos de informar que o(a) aluno(a) ${studentName} recebeu uma ocorrência referente a: ${parte}${hasOutros ? `. Observação: ${outrosText}` : ''}. Aula de ${subject} no dia ${date} às ${time}. Professor(a): ${teacher}.`;
  };

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
  const lbl = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '600' };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
    </div>
  );

  if (!hasMinRequirements) return (
    <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
      <AlertCircle size={64} color="#9b1c26" style={{ marginBottom: '16px', marginLeft: 'auto', marginRight: 'auto' }} />
      <h2 style={{ color: '#111827', marginBottom: '8px' }}>Não é possível registrar ocorrências ainda</h2>
      <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
        Para registrar uma ocorrência, é necessário que existam <strong>pelo menos 1 professor</strong> e <strong>pelo menos 1 aluno</strong> cadastrados na escola.
        <br />Peça ao gestor para cadastrar os professores e alunos primeiro.
      </p>
    </div>
  );

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '4px', color: '#111827' }}>FAZER OC</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '14px' }}>Registre até 4 ocorrências por ação</p>

      {success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle color="#059669" size={24} />
          <div>
            <strong style={{ color: '#065f46' }}>Ocorrência registrada com sucesso!</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#047857' }}>A ocorrência foi encaminhada para a área de Comunicações do gestor.</p>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Aluno */}
        <div>
          <label style={lbl}>1. Selecionar Aluno</label>
          <select style={inp} value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
            <option value="">Selecione o aluno...</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.class_students?.[0]?.classes?.name ? ` — ${s.class_students[0].classes.name}` : ''}</option>
            ))}
          </select>
        </div>

        {/* Professor (caso seja gestor e queira vincular a um professor específico) */}
        {professorsList.length > 0 && (
          <div>
            <label style={lbl}>Professor Relator</label>
            <select style={inp} value={teacherName} onChange={e => setTeacherName(e.target.value)}>
              <option value="Gestão Escolar">Gestão Escolar</option>
              {professorsList.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Data + Horário */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={lbl}>2. Data da Ocorrência</label>
            <input type="date" style={inp} value={form.date}
              min="2026-08-01" max="2028-12-31"
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>3. Horário</label>
            <input type="time" style={inp} value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
          </div>
        </div>

        {/* Disciplina */}
        <div>
          <label style={lbl}>4. Disciplina</label>
          <input type="text" style={inp} placeholder="Ex: Matemática, Português, Ciências..."
            value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
        </div>

        {/* Tipos de Ocorrência */}
        <div>
          <label style={lbl}>5. Selecionar Ocorrências (máx. 4)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {INCIDENT_TYPES_DEFAULT.map(type => {
              const isSelected = selectedTypes.includes(type.id);
              const isDisabled = !isSelected && selectedTypes.length >= 4;
              return (
                <button
                  key={type.id}
                  onClick={() => !isDisabled && toggleType(type.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', border: `2px solid ${isSelected ? '#9b1c26' : '#e5e7eb'}`,
                    borderRadius: '8px', background: isSelected ? '#fdf2f2' : '#fff',
                    cursor: isDisabled ? 'not-allowed' : 'pointer', textAlign: 'left',
                    opacity: isDisabled ? 0.45 : 1, transition: 'all 0.15s'
                  }}
                >
                  {isSelected
                    ? <CheckSquare size={20} color="#9b1c26" />
                    : <Square size={20} color="#9ca3af" />}
                  <span style={{ fontWeight: isSelected ? '600' : '400', color: isSelected ? '#7f1d1d' : '#374151', fontSize: '14px' }}>
                    {type.label}
                  </span>
                  {type.id === 'outros' && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>campo livre</span>}
                </button>
              );
            })}
          </div>

          {selectedTypes.length > 0 && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#9b1c26', fontWeight: '600' }}>
              {selectedTypes.length} / 4 ocorrências selecionadas
            </p>
          )}
        </div>

        {/* Campo "Outros" */}
        {selectedTypes.includes('outros') && (
          <div>
            <label style={lbl}>Descrição da ocorrência "Outros"</label>
            <textarea
              style={{ ...inp, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Descreva a ocorrência com suas próprias palavras..."
              value={outrosText}
              maxLength={500}
              onChange={e => setOutrosText(e.target.value)}
            />
            <p style={{ marginTop: '4px', fontSize: '12px', color: outrosText.length > 490 ? '#ef4444' : '#6b7280', textAlign: 'right' }}>
              {outrosText.length} / 500 caracteres
            </p>
          </div>
        )}

        {/* Botão */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            padding: '14px', backgroundColor: '#9b1c26', color: 'white', border: 'none',
            borderRadius: '8px', fontWeight: '700', fontSize: '16px', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s'
          }}
        >
          {saving ? <Loader2 size={20} className="animar-giro" /> : null}
          {saving ? 'Registrando...' : 'Registrar Ocorrência'}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animar-giro { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}

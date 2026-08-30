import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { CheckSquare, Square, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export default function FazerOC() {
  const [schoolId, setSchoolId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [myRole, setMyRole] = useState(null);
  const [professorsList, setProfessorsList] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [students, setStudents] = useState([]);
  const [incidentTypes, setIncidentTypes] = useState([]);
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
  const [continuationMessage, setContinuationMessage] = useState('');

  const CONTINUATION_OPTIONS = [
    { value: '', label: 'Nenhuma mensagem adicional' },
    { value: 'Por gentileza, converse com o(a) aluno(a) para que essa situação não volte a ocorrer.', label: 'Por gentileza, converse com o(a) aluno(a) para que essa situação não volte a ocorrer.' },
    { value: 'Por favor, converse com o(a) aluno(a) para que possamos ter um melhor desempenho escolar.', label: 'Por favor, converse com o(a) aluno(a) para que possamos ter um melhor desempenho escolar.' },
    { value: 'Pedimos, por gentileza, que converse com o(a) aluno(a) sobre o ocorrido e reforce a importância de manter uma boa postura durante as atividades escolares.', label: 'Pedimos, por gentileza, que converse com o(a) aluno(a) sobre o ocorrido e reforce a importância de manter uma boa postura durante as atividades escolares.' },
    { value: 'Contamos com a parceria da família para orientar o(a) aluno(a) e contribuir para que essa situação não volte a ocorrer.', label: 'Contamos com a parceria da família para orientar o(a) aluno(a) e contribuir para que essa situação não volte a ocorrer.' },
    { value: 'Pedimos uma atenção especial a essa situação e, se possível, que converse com o(a) aluno(a) sobre o ocorrido.', label: 'Pedimos uma atenção especial a essa situação e, se possível, que converse com o(a) aluno(a) sobre o ocorrido.' },
    { value: 'Pedimos o apoio da família para que o(a) aluno(a) compreenda a importância de cumprir as regras e manter um bom comportamento escolar.', label: 'Pedimos o apoio da família para que o(a) aluno(a) compreenda a importância de cumprir as regras e manter um bom comportamento escolar.' },
    { value: 'Esperamos que, com a orientação da família e da escola, possamos contribuir para uma melhora nesse comportamento.', label: 'Esperamos que, com a orientação da família e da escola, possamos contribuir para uma melhora nesse comportamento.' },
    { value: 'Pedimos que acompanhe essa situação junto ao(à) aluno(a), para que possamos trabalhar em conjunto em busca de melhores resultados.', label: 'Pedimos que acompanhe essa situação junto ao(à) aluno(a), para que possamos trabalhar em conjunto em busca de melhores resultados.' },
    { value: 'Por gentileza, converse com o(a) aluno(a) sobre o ocorrido. A parceria entre família e escola é fundamental para seu desenvolvimento escolar.', label: 'Por gentileza, converse com o(a) aluno(a) sobre o ocorrido. A parceria entre família e escola é fundamental para seu desenvolvimento escolar.' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, name, role, id')
      .eq('id', userData.user.id)
      .single();

    setSchoolId(profile.school_id);
    setTeacherId(profile.id);
    setMyRole(profile.role);
    setTeacherName(profile.name || 'Professor');

    // Buscar professores da escola para permitir seleção caso seja gestor/admin
    if (profile.role === 'gestor' || profile.role === 'admin') {
      const { data: profsData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('school_id', profile.school_id)
        .eq('role', 'professor')
        .order('name');
      setProfessorsList(profsData || []);
    }

    // Buscar alunos
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, name, guardian_name, guardian_phone, class_students(class_id, classes(name))')
      .eq('school_id', profile.school_id)
      .eq('status', 'active')
      .order('name');

    setStudents(studentsData || []);
    setHasMinRequirements((studentsData || []).length > 0);

    // Buscar tipos de ocorrência DINAMICAMENTE (globais + da escola)
    const { data: typesData } = await supabase
      .from('incident_types')
      .select('id, name, school_id, is_default')
      .or(`school_id.is.null,school_id.eq.${profile.school_id}`)
      .eq('active', true)
      .order('is_default', { ascending: false })
      .order('name');

    setIncidentTypes(typesData || []);
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

  const getOutrosType = () => incidentTypes.find(t => t.name.toLowerCase() === 'outros');

  const handleSubmit = async () => {
    if (!form.student_id) return showToast('Selecione um aluno.', 'error');
    if (!form.date) return showToast('Informe a data.', 'error');
    if (!form.time) return showToast('Informe o horário.', 'error');
    if (!form.subject.trim()) return showToast('Informe a disciplina.', 'error');
    if (selectedTypes.length === 0) return showToast('Selecione pelo menos 1 ocorrência.', 'error');

    const outrosType = getOutrosType();
    const hasOutros = outrosType && selectedTypes.includes(outrosType.id);
    if (hasOutros && !outrosText.trim()) return showToast('Descreva a ocorrência "Outros".', 'error');

    setSaving(true);
    try {
      const student = students.find(s => s.id === form.student_id);
      const classId = student?.class_students?.[0]?.class_id || null;
      const className = student?.class_students?.[0]?.classes?.name || '';

      // Montar lista de tipos selecionados com labels
      const typesListForDB = selectedTypes.map(id => {
        const t = incidentTypes.find(x => x.id === id);
        return { id, label: t?.name || id };
      });

      // Professor que irá assinar a ocorrência
      const finalTeacherId = (myRole === 'gestor' || myRole === 'admin') && selectedTeacherId
        ? selectedTeacherId
        : teacherId;
      const finalTeacherName = (myRole === 'gestor' || myRole === 'admin') && selectedTeacherId
        ? professorsList.find(p => p.id === selectedTeacherId)?.name || teacherName
        : teacherName;

      // 1. Criar o incident
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          school_id: schoolId,
          student_id: form.student_id,
          teacher_id: finalTeacherId,
          class_id: classId,
          incident_date: new Date(form.date + 'T' + (form.time || '12:00') + ':00').toISOString(),
          incident_date_only: form.date,
          incident_time: form.time,
          subject: form.subject,
          incident_types_list: typesListForDB,
          outros_description: hasOutros ? outrosText : null,
          status: 'pending',
          severity: 'low',
          description: typesListForDB.map(t => t.label).join(', '),
        })
        .select()
        .single();

      if (incidentError) throw incidentError;

      // 2. Criar a comunicação para o gestor
      const guardianPhone = student?.guardian_phone || '';
      const dateFormatted = new Date(form.date + 'T12:00:00').toLocaleDateString('pt-BR');

      const { error: commError } = await supabase.from('communications').insert({
        school_id: schoolId,
        incident_id: incident.id,
        student_id: form.student_id,
        channel: 'whatsapp',
        recipient_name: student?.guardian_name || 'Responsável',
        recipient_contact: guardianPhone,
        status: 'pending',
        teacher_name: finalTeacherName,
        subject: form.subject,
        incident_time: form.time,
        incident_types_list: typesListForDB,
        outros_description: hasOutros ? outrosText : null,
        student_name: student?.name || '',
        guardian_phone: guardianPhone,
        class_name: className,
        message: buildMessage({
          studentName: student?.name || '',
          types: typesListForDB,
          subject: form.subject,
          date: dateFormatted,
          time: form.time,
          teacher: finalTeacherName,
          outrosText: hasOutros ? outrosText : null,
          outrosTypeId: outrosType?.id,
        }),
      });

      if (commError) console.error('Erro ao criar comunicação:', commError);

      setSuccess(true);
      setForm({ student_id: '', date: new Date().toISOString().split('T')[0], time: '', subject: '' });
      setSelectedTypes([]);
      setOutrosText('');
      setContinuationMessage('');
      setSelectedTeacherId('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar ocorrência: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const buildMessage = ({ studentName, types, subject, date, time, teacher, outrosText, outrosTypeId }) => {
    const hasOutros = outrosTypeId && types.some(t => t.id === outrosTypeId);
    const tiposNormais = types.filter(t => t.id !== outrosTypeId).map(t => t.label).join(', ');

    let msg = '';
    if (hasOutros && tiposNormais.length === 0) {
      msg = `Bom dia! Gostaríamos de informar que o(a) aluno(a) ${studentName} recebeu uma ocorrência. Motivo: ${outrosText}. Aula de ${subject} no dia ${date} às ${time}. Professor(a): ${teacher}.`;
    } else {
      const parte = tiposNormais || outrosText;
      msg = `Bom dia! Gostaríamos de informar que o(a) aluno(a) ${studentName} recebeu uma ocorrência referente a: ${parte}${hasOutros ? `. Observação: ${outrosText}` : ''}. Aula de ${subject} no dia ${date} às ${time}. Professor(a): ${teacher}.`;
    }

    if (continuationMessage) {
      msg += `\n\n${continuationMessage}`;
    }

    return msg;
  };

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
  const lbl = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '600' };
  const outrosType = getOutrosType();
  const hasOutros = outrosType && selectedTypes.includes(outrosType.id);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
    </div>
  );

  if (!hasMinRequirements) return (
    <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
      <AlertCircle size={64} color="#9b1c26" style={{ marginBottom: '16px', marginLeft: 'auto', marginRight: 'auto' }} />
      <h2 style={{ color: '#111827', marginBottom: '8px' }}>Nenhum aluno cadastrado nesta escola</h2>
      <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
        Para registrar uma ocorrência em <strong>FAZER OC</strong>, é necessário que existam <strong>alunos cadastrados</strong> na sua escola.
        <br />Peça ao gestor escolar para cadastrar ou importar os alunos da escola primeiro.
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

        {/* Professor Relator (caso seja gestor) */}
        {(myRole === 'gestor' || myRole === 'admin') && (
          <div>
            <label style={lbl}>Professor Relator</label>
            <select style={inp} value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}>
              <option value="">Gestão Escolar (eu mesmo)</option>
              {professorsList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Data + Horário */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={lbl}>2. Data da Ocorrência</label>
            <input type="date" style={inp} value={form.date}
              min="2020-01-01" max="2030-12-31"
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

        {/* Tipos de Ocorrência — DINÂMICO */}
        <div>
          <label style={lbl}>5. Selecionar Ocorrências (máx. 4)</label>
          {incidentTypes.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', fontSize: '14px' }}>
              Nenhum tipo de ocorrência cadastrado. Peça ao gestor para cadastrar na aba <strong>Ocorrências</strong>.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {incidentTypes.map(type => {
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
                      {type.name}
                    </span>
                    {type.name.toLowerCase() === 'outros' && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>campo livre</span>}
                  </button>
                );
              })}
            </div>
          )}

          {selectedTypes.length > 0 && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#9b1c26', fontWeight: '600' }}>
              {selectedTypes.length} / 4 ocorrências selecionadas
            </p>
          )}
        </div>

        {/* Campo "Outros" */}
        {hasOutros && (
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

        {/* Mensagem de continuação */}
        <div>
          <label style={lbl}>Mensagem de continuação</label>
          <select style={inp} value={continuationMessage} onChange={e => setContinuationMessage(e.target.value)}>
            {CONTINUATION_OPTIONS.map((opt, i) => (
              <option key={i} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

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
          {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {saving ? 'Registrando...' : 'Registrar Ocorrência'}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

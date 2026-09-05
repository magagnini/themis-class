import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import Select from 'react-select';

export default function FazerOC() {
  const [schoolId, setSchoolId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [myRole, setMyRole] = useState(null);
  const [professorsList, setProfessorsList] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Turmas e alunos (filtrado por turma)
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [incidentTypes, setIncidentTypes] = useState([]);
  const [hasMinRequirements, setHasMinRequirements] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    student_id: '',
    student_age: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    subject: '',
  });

  const [occ1, setOcc1] = useState('');
  const [occ2, setOcc2] = useState('');
  const [occ3, setOcc3] = useState('');
  const [occ4, setOcc4] = useState('');

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
    { value: 'Por gentileza, converse com o(a) aluno(a) sobre o ocorrido. A parceria entre família e escola é fundamental para seu desenvolvimento escolar.', label: 'Por gentileza, converse com o(a) aluno(a) sobre o ocorrido. A parceria entre família e escola é fundamental para seu desenvolvimento escolar.' },
    { value: 'Solicitamos, por gentileza, o comparecimento do responsável à escola para conversarmos sobre o ocorrido e buscarmos juntos a melhor orientação para o(a) aluno(a).', label: 'Solicitamos, por gentileza, o comparecimento do responsável à escola para conversarmos sobre o ocorrido e buscarmos juntos a melhor orientação para o(a) aluno(a).' }
  ];

  useEffect(() => { loadData(); }, []);

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

    if (profile.role === 'gestor' || profile.role === 'admin') {
      const { data: profsData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('school_id', profile.school_id)
        .eq('role', 'professor')
        .order('name');
      setProfessorsList(profsData || []);
    }

    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', profile.school_id)
      .eq('active', true)
      .order('name');

    setClasses(classesData || []);
    setHasMinRequirements((classesData || []).length > 0);

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

  const handleClassChange = async (classId) => {
    setSelectedClassId(classId);
    setForm(p => ({ ...p, student_id: '', student_age: '' }));
    setStudents([]);

    if (!classId) return;

    setLoadingStudents(true);
    const { data: csData } = await supabase
      .from('class_students')
      .select('student_id, students(id, name, guardian_name, guardian_phone, class_students(class_id, classes(name)))')
      .eq('class_id', classId);

    const mapped = (csData || [])
      .map(cs => cs.students)
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    setStudents(mapped);
    setLoadingStudents(false);
  };

  const getOutrosType = () => incidentTypes.find(t => t.name.toLowerCase() === 'outros');

  const handleSubmit = async () => {
    if (!selectedClassId) return showToast('Selecione uma turma.', 'error');
    if (!form.student_id) return showToast('Selecione um aluno.', 'error');
    
    const age = parseInt(form.student_age, 10);
    if (!age || age < 3 || age > 25) {
      return showToast('Informe uma idade válida para o aluno (entre 3 e 25 anos).', 'error');
    }

    if (!form.date) return showToast('Informe a data.', 'error');
    if (!form.time) return showToast('Informe o horário.', 'error');
    if (!form.subject.trim()) return showToast('Informe a disciplina.', 'error');
    
    if (!occ1) return showToast('A Ocorrência 1 é obrigatória.', 'error');

    const selectedList = [occ1, occ2, occ3, occ4].filter(Boolean);
    const uniqueList = new Set(selectedList);

    if (uniqueList.size !== selectedList.length) {
      return showToast('Essa ocorrência já foi selecionada.', 'error');
    }

    const outrosType = getOutrosType();
    const hasOutros = outrosType && selectedList.includes(outrosType.id);
    if (hasOutros && !outrosText.trim()) return showToast('Descreva a ocorrência "Outros".', 'error');

    setSaving(true);
    try {
      const student = students.find(s => s.id === form.student_id);
      const classId = selectedClassId;
      const className = classes.find(c => c.id === selectedClassId)?.name || '';

      const typesListForDB = selectedList.map(id => {
        const t = incidentTypes.find(x => x.id === id);
        return { id, label: t?.name || id };
      });

      const finalTeacherId = (myRole === 'gestor' || myRole === 'admin') && selectedTeacherId
        ? selectedTeacherId
        : teacherId;
      const finalTeacherName = (myRole === 'gestor' || myRole === 'admin') && selectedTeacherId
        ? professorsList.find(p => p.id === selectedTeacherId)?.name || teacherName
        : teacherName;

      // 1. Gerar número de ocorrência único e sequencial para a escola (01, 02, 03...)
      const { count: schoolIncidentCount } = await supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId);

      const nextSeq = (schoolIncidentCount || 0) + 1;
      const incidentNumber = String(nextSeq).padStart(2, '0');

      const incidentPayload = {
        school_id: schoolId,
        student_id: form.student_id,
        student_age: age,
        teacher_id: finalTeacherId,
        class_id: classId,
        class_name: className,
        incident_date: new Date(form.date + 'T' + (form.time || '12:00') + ':00').toISOString(),
        incident_date_only: form.date,
        incident_time: form.time,
        subject: form.subject,
        incident_types_list: typesListForDB,
        outros_description: hasOutros ? outrosText : null,
        status: 'pending',
        severity: 'low',
        description: typesListForDB.map(t => t.label).join(', '),
        incident_number: incidentNumber,
      };

      let { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .insert(incidentPayload)
        .select()
        .single();

      // Fallback seguro caso a coluna incident_number não esteja na tabela incidents
      if (incidentError && incidentError.message?.includes('incident_number')) {
        delete incidentPayload.incident_number;
        const retry = await supabase.from('incidents').insert(incidentPayload).select().single();
        incident = retry.data;
        incidentError = retry.error;
      }

      if (incidentError) throw incidentError;

      const guardianPhone = student?.guardian_phone || '';
      const dateFormatted = new Date(form.date + 'T12:00:00').toLocaleDateString('pt-BR');

      const msgFinal = buildMessage({
        studentName: student?.name || '',
        age: age,
        types: typesListForDB,
        subject: form.subject,
        date: dateFormatted,
        time: form.time,
        teacher: finalTeacherName,
        outrosText: hasOutros ? outrosText : null,
        outrosTypeId: outrosType?.id,
      });

      const commPayload = {
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
        message: msgFinal,
        incident_number: incidentNumber,
      };

      const { error: commError } = await supabase.from('communications').insert(commPayload);
      if (commError && commError.message?.includes('incident_number')) {
        delete commPayload.incident_number;
        await supabase.from('communications').insert(commPayload);
      } else if (commError) {
        console.error('Erro ao criar comunicação:', commError);
      }

      setSuccess(true);
      // Reset completo — incluindo turma/aluno para evitar tela branca
      setForm({ student_id: '', student_age: '', date: new Date().toISOString().split('T')[0], time: '', subject: '' });
      setSelectedClassId('');
      setStudents([]);
      setOcc1('');
      setOcc2('');
      setOcc3('');
      setOcc4('');
      setOutrosText('');
      setContinuationMessage('');
      setSelectedTeacherId('');

      // Subir para o topo da página após registrar
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccess(false), 6000);
    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar ocorrência: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const buildMessage = ({ studentName, age, types, subject, date, time, teacher, outrosText, outrosTypeId }) => {
    const hasOutros = outrosTypeId && types.some(t => t.id === outrosTypeId);
    
    // Lista de nomes para a mensagem
    let labels = types.map(t => t.label);
    if (hasOutros && outrosText) {
      // Substituir 'Outros' por sua descrição ou omitir se for muito estranho
      // O prompt diz "Atraso, Indisciplina, Uso Inadequado de Dispositivos Eletrônicos e Vulnerabilidade Familiar"
      // E para outros, "Esse texto deverá ser incorporado à mensagem do WhatsApp normalmente."
      // Para manter natural, podemos remover "Outros" da lista e apensar no final "referente a: A, B. Observação: XXX"
      // ou incluir o texto direto. A regra anterior:
      // "referente a: A, B. Observação: XXX"
      labels = types.filter(t => t.id !== outrosTypeId).map(t => t.label);
    }

    let joinedLabels = '';
    if (labels.length === 1) {
      joinedLabels = labels[0];
    } else if (labels.length > 1) {
      const last = labels.pop();
      joinedLabels = labels.join(', ') + ' e ' + last;
    }

    let msg = '';
    if (hasOutros && joinedLabels.length === 0) {
      msg = `Bom dia! Gostaríamos de informar que o(a) aluno(a) ${studentName}, ${age} anos, recebeu uma ocorrência. Motivo: ${outrosText}. Aula de ${subject} no dia ${date} às ${time}. Professor(a): ${teacher}.`;
    } else {
      const parte = joinedLabels || outrosText;
      msg = `Bom dia! Gostaríamos de informar que o(a) aluno(a) ${studentName}, ${age} anos, recebeu uma ocorrência referente a: ${parte}${hasOutros ? `. Observação: ${outrosText}` : ''}. Aula de ${subject} no dia ${date} às ${time}. Professor(a): ${teacher}.`;
    }

    if (continuationMessage) {
      msg += `\n\n${continuationMessage}`;
    }

    return msg;
  };

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
  const lbl = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '600' };
  
  const hasOutros = getOutrosType() && [occ1, occ2, occ3, occ4].includes(getOutrosType().id);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
    </div>
  );

  if (!hasMinRequirements) return (
    <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
      <AlertCircle size={64} color="#9b1c26" style={{ marginBottom: '16px', marginLeft: 'auto', marginRight: 'auto' }} />
      <h2 style={{ color: '#111827', marginBottom: '8px' }}>Nenhuma turma cadastrada nesta escola</h2>
      <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
        Para registrar uma ocorrência em <strong>FAZER OC</strong>, é necessário que existam <strong>turmas e alunos cadastrados</strong> na escola.
        <br />Peça ao gestor escolar para cadastrar ou importar os alunos primeiro.
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

        {/* 1. TURMA — primeiro campo */}
        <div>
          <label style={lbl}>1. Selecionar Turma</label>
          <select style={inp} value={selectedClassId} onChange={e => handleClassChange(e.target.value)}>
            <option value="">Selecione a turma...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 2. ALUNO e IDADE */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <div>
            <label style={lbl}>2. Selecionar Aluno</label>
            {!selectedClassId ? (
              <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#9ca3af', border: '1px solid #e5e7eb' }}>
                Selecione uma turma primeiro...
              </div>
            ) : loadingStudents ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando alunos...
              </div>
            ) : students.length === 0 ? (
              <div style={{ padding: '10px 12px', background: '#fef2f2', borderRadius: '8px', fontSize: '13px', color: '#991b1b', border: '1px solid #fecaca' }}>
                Nenhum aluno nesta turma.
              </div>
            ) : (
              <select style={inp} value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
                <option value="">Selecione o aluno...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label style={lbl}>Idade</label>
            <input 
              type="number" 
              style={inp} 
              placeholder="Ex: 14"
              min="3" 
              max="25"
              value={form.student_age} 
              onChange={e => setForm(p => ({ ...p, student_age: e.target.value }))} 
            />
          </div>
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
            <label style={lbl}>3. Data da Ocorrência</label>
            <input type="date" style={inp} value={form.date} min="2020-01-01" max="2030-12-31" onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>4. Horário</label>
            <input type="time" style={inp} value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
          </div>
        </div>

        {/* Disciplina */}
        <div>
          <label style={lbl}>5. Disciplina</label>
          <input type="text" style={inp} placeholder="Ex: Matemática, Português, Ciências..." value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
        </div>

        {/* Ocorrências */}
        <div>
          <label style={lbl}>6. Selecionar Ocorrências (Ocorrência 1 é obrigatória)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', width: '90px' }}>Ocorrência 1:</span>
              <div style={{ flex: 1 }}>
                <Select
                  options={incidentTypes.map(t => ({ value: t.id, label: t.name }))}
                  value={occ1 ? { value: occ1, label: incidentTypes.find(t => t.id === occ1)?.name } : null}
                  onChange={sel => setOcc1(sel ? sel.value : '')}
                  placeholder="Selecione a ocorrência..."
                  isClearable
                  styles={{ control: (base) => ({ ...base, minHeight: '40px', borderColor: '#d1d5db', borderRadius: '6px' }) }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', width: '90px' }}>Ocorrência 2:</span>
              <div style={{ flex: 1 }}>
                <Select
                  options={incidentTypes.map(t => ({ value: t.id, label: t.name }))}
                  value={occ2 ? { value: occ2, label: incidentTypes.find(t => t.id === occ2)?.name } : null}
                  onChange={sel => setOcc2(sel ? sel.value : '')}
                  placeholder="Selecione a ocorrência... (Opcional)"
                  isClearable
                  styles={{ control: (base) => ({ ...base, minHeight: '40px', borderColor: '#d1d5db', borderRadius: '6px' }) }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', width: '90px' }}>Ocorrência 3:</span>
              <div style={{ flex: 1 }}>
                <Select
                  options={incidentTypes.map(t => ({ value: t.id, label: t.name }))}
                  value={occ3 ? { value: occ3, label: incidentTypes.find(t => t.id === occ3)?.name } : null}
                  onChange={sel => setOcc3(sel ? sel.value : '')}
                  placeholder="Selecione a ocorrência... (Opcional)"
                  isClearable
                  styles={{ control: (base) => ({ ...base, minHeight: '40px', borderColor: '#d1d5db', borderRadius: '6px' }) }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', width: '90px' }}>Ocorrência 4:</span>
              <div style={{ flex: 1 }}>
                <Select
                  options={incidentTypes.map(t => ({ value: t.id, label: t.name }))}
                  value={occ4 ? { value: occ4, label: incidentTypes.find(t => t.id === occ4)?.name } : null}
                  onChange={sel => setOcc4(sel ? sel.value : '')}
                  placeholder="Selecione a ocorrência... (Opcional)"
                  isClearable
                  styles={{ control: (base) => ({ ...base, minHeight: '40px', borderColor: '#d1d5db', borderRadius: '6px' }) }}
                />
              </div>
            </div>

          </div>
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

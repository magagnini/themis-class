import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { ClipboardList, Loader2, Search, ChevronRight } from 'lucide-react';

export default function FazerDesdobramento() {
  const [schoolId, setSchoolId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [classes, setClasses]         = useState([]);
  const [students, setStudents]       = useState([]);
  const [incidents, setIncidents]     = useState([]);
  const [followupTypes, setFollowupTypes] = useState([]);

  // Form state
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [followups, setFollowups] = useState(['', '', '', '']);
  const [complementacao, setComplementacao] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles').select('school_id').eq('id', user.id).single();
    if (!profile?.school_id) { setLoading(false); return; }

    setSchoolId(profile.school_id);

    // Carregar turmas e tipos de desdobramento
    const [classesRes, typesRes] = await Promise.all([
      supabase.from('classes').select('id, name').eq('school_id', profile.school_id).eq('active', true).order('name'),
      supabase.from('followup_types')
        .select('id, name')
        .or(`school_id.is.null,school_id.eq.${profile.school_id}`)
        .eq('active', true)
        .order('name'),
    ]);

    setClasses(classesRes.data || []);
    setFollowupTypes(typesRes.data || []);
    setLoading(false);
  };

  const handleClassChange = async (classId) => {
    setSelectedClassId(classId);
    setSelectedStudent(null);
    setStudents([]);
    setSelectedIncident('');
    setIncidents([]);

    if (!classId) return;

    setLoadingStudents(true);
    const { data: csData } = await supabase
      .from('class_students')
      .select('student_id, students(id, name, status)')
      .eq('class_id', classId);

    const mapped = (csData || [])
      .map(cs => cs.students)
      .filter(s => s && s.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));

    setStudents(mapped);
    setLoadingStudents(false);
  };

  const selectStudent = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    setSelectedStudent(student || null);
    setSelectedIncident('');
    setIncidents([]);

    if (!student) return;

    setLoadingIncidents(true);
    const { data } = await supabase
      .from('incidents')
      .select('id, incident_date, incident_types_list, description')
      .eq('student_id', student.id)
      .order('incident_date', { ascending: false })
      .limit(50);

    setIncidents(data || []);
    setLoadingIncidents(false);
  };

  const formatIncidentLabel = (inc) => {
    const types = (inc.incident_types_list || []).map(t => t.label).join(', ');
    const date = new Date(inc.incident_date).toLocaleDateString('pt-BR');
    return `${date} — ${types || inc.description || 'Ocorrência'}`;
  };

  const handleSave = async () => {
    if (!selectedStudent) return showToast('Selecione um aluno.', 'error');
    if (!selectedIncident) return showToast('Selecione a ocorrência relacionada.', 'error');
    if (followups.every(f => !f)) return showToast('Selecione pelo menos um desdobramento.', 'error');

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('followups').insert({
      school_id: schoolId,
      student_id: selectedStudent.id,
      incident_id: selectedIncident,
      created_by: user.id,
      followup_1: followups[0] || null,
      followup_2: followups[1] || null,
      followup_3: followups[2] || null,
      followup_4: followups[3] || null,
      complementacao: complementacao.trim() || null,
    });

    if (error) {
      showToast('Erro ao salvar desdobramento: ' + error.message, 'error');
    } else {
      showToast('Desdobramento registrado com sucesso!');
      // Reset form
      setSelectedStudent(null);
      setSelectedIncident('');
      setIncidents([]);
      setFollowups(['', '', '', '']);
      setComplementacao('');
      // Mantém a turma selecionada para facilitar o próximo
      const classEl = document.getElementById('student-select');
      if (classEl) classEl.value = '';
    }
    setSaving(false);
  };

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const lbl = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '600' };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={24} color="#9b1c26" /> Fazer Desdobramento
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
          Registre as ações realizadas após uma ocorrência escolar.
        </p>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Passo 1: Turma */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#9b1c26', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>1</div>
            <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Selecionar Turma</span>
          </div>
          <select
            style={{ ...inp, color: selectedClassId ? '#111827' : '#9ca3af' }}
            value={selectedClassId}
            onChange={e => handleClassChange(e.target.value)}
          >
            <option value="">Selecione uma turma...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Passo 2: Aluno */}
        <div style={{ opacity: selectedClassId ? 1 : 0.6, pointerEvents: selectedClassId ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: selectedClassId ? '#9b1c26' : '#d1d5db', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>2</div>
            <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Selecionar Aluno</span>
          </div>
          {loadingStudents ? (
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
            </div>
          ) : (
            <select
              id="student-select"
              style={{ ...inp, color: selectedStudent ? '#111827' : '#9ca3af' }}
              value={selectedStudent ? selectedStudent.id : ''}
              onChange={e => selectStudent(e.target.value)}
              disabled={!selectedClassId}
            >
              <option value="">{selectedClassId ? 'Selecione o aluno...' : 'Selecione uma turma primeiro'}</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Passo 3: Ocorrência */}
        <div style={{ opacity: selectedStudent ? 1 : 0.6, pointerEvents: selectedStudent ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: selectedStudent ? '#9b1c26' : '#d1d5db', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>3</div>
            <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Selecionar Ocorrência Relacionada</span>
          </div>
          {loadingIncidents ? (
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
            </div>
          ) : (
            <select
              style={{ ...inp, color: selectedIncident ? '#111827' : '#9ca3af' }}
              value={selectedIncident}
              onChange={e => setSelectedIncident(e.target.value)}
              disabled={!selectedStudent}
            >
              <option value="">{selectedStudent ? 'Selecione a ocorrência...' : 'Selecione um aluno primeiro'}</option>
              {incidents.map(inc => (
                <option key={inc.id} value={inc.id}>{formatIncidentLabel(inc)}</option>
              ))}
            </select>
          )}
          {selectedStudent && incidents.length === 0 && !loadingIncidents && (
            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#f59e0b' }}>Este aluno não possui ocorrências registradas.</p>
          )}
        </div>

        {/* Passo 4: Desdobramentos */}
        <div style={{ opacity: selectedIncident ? 1 : 0.6, pointerEvents: selectedIncident ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: selectedIncident ? '#9b1c26' : '#d1d5db', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>4</div>
            <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Desdobramentos Realizados (máx. 4)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i}>
                <label style={lbl}>Desdobramento {i + 1} {i === 0 ? '*' : '(opcional)'}</label>
                <select
                  style={{ ...inp, color: followups[i] ? '#111827' : '#9ca3af' }}
                  value={followups[i]}
                  onChange={e => {
                    const updated = [...followups];
                    updated[i] = e.target.value;
                    setFollowups(updated);
                  }}
                  disabled={!selectedIncident}
                >
                  <option value="">— Nenhum —</option>
                  {followupTypes.map(ft => (
                    <option key={ft.id} value={ft.id}>{ft.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Complementação */}
        <div style={{ opacity: selectedIncident ? 1 : 0.6, pointerEvents: selectedIncident ? 'auto' : 'none' }}>
          <label style={lbl}>Complementação / Observações da opção "Outros" (opcional)</label>
          <textarea
            style={{ ...inp, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="Descreva informações adicionais ou especifique caso tenha selecionado 'Outros'..."
            value={complementacao}
            maxLength={1000}
            onChange={e => setComplementacao(e.target.value)}
          />
          <div style={{ textAlign: 'right', fontSize: '11px', color: complementacao.length > 900 ? '#ef4444' : '#9ca3af', marginTop: '4px' }}>
            {complementacao.length}/1000
          </div>
        </div>

        {/* Botão Salvar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={handleSave}
            disabled={saving || !selectedStudent || !selectedIncident}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 28px', backgroundColor: saving || !selectedStudent || !selectedIncident ? '#d1d5db' : '#9b1c26',
              color: 'white', border: 'none', borderRadius: '8px',
              fontWeight: '700', fontSize: '15px',
              cursor: saving || !selectedStudent || !selectedIncident ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <ClipboardList size={18} />}
            {saving ? 'Salvando...' : 'Salvar Desdobramento'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

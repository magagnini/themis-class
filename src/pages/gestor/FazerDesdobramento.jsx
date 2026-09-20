import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { ClipboardList, Loader2, Search, ChevronRight } from 'lucide-react';

export default function FazerDesdobramento() {
  const [schoolId, setSchoolId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [students, setStudents]       = useState([]);
  const [incidents, setIncidents]     = useState([]);
  const [followupTypes, setFollowupTypes] = useState([]);

  // Form state
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [followups, setFollowups] = useState(['', '', '', '']);
  const [complementacao, setComplementacao] = useState('');
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles').select('school_id').eq('id', user.id).single();
    if (!profile?.school_id) { setLoading(false); return; }

    setSchoolId(profile.school_id);

    // Carregar alunos e tipos de desdobramento em paralelo
    const [studentsRes, typesRes] = await Promise.all([
      supabase.from('students').select('id, name').eq('school_id', profile.school_id).eq('status', 'active').order('name'),
      supabase.from('followup_types')
        .select('id, name')
        .or(`school_id.is.null,school_id.eq.${profile.school_id}`)
        .eq('active', true)
        .order('name'),
    ]);

    setStudents(studentsRes.data || []);
    setFollowupTypes(typesRes.data || []);
    setLoading(false);
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setStudentSearch(student.name);
    setShowStudentList(false);
    setSelectedIncident('');
    setIncidents([]);
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
      setStudentSearch('');
      setSelectedIncident('');
      setIncidents([]);
      setFollowups(['', '', '', '']);
      setComplementacao('');
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

        {/* Passo 1: Aluno */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#9b1c26', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>1</div>
            <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Selecionar Aluno</span>
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '11px', color: '#9ca3af' }} size={16} />
            <input
              type="text"
              placeholder="Buscar aluno por nome..."
              style={{ ...inp, paddingLeft: '36px' }}
              value={studentSearch}
              onChange={e => {
                setStudentSearch(e.target.value);
                setShowStudentList(true);
                if (!e.target.value) { setSelectedStudent(null); setIncidents([]); }
              }}
              onFocus={() => setShowStudentList(true)}
            />
            {showStudentList && studentSearch && filteredStudents.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                {filteredStudents.slice(0, 20).map(s => (
                  <div
                    key={s.id}
                    onClick={() => selectStudent(s)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '14px', color: '#111827', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <ChevronRight size={14} color="#9b1c26" /> {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedStudent && (
            <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#fdf2f2', borderRadius: '6px', fontSize: '13px', color: '#9b1c26', fontWeight: '600' }}>
              ✓ Aluno selecionado: {selectedStudent.name}
            </div>
          )}
        </div>

        {/* Passo 2: Ocorrência */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: selectedStudent ? '#9b1c26' : '#d1d5db', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>2</div>
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

        {/* Passo 3: Desdobramentos */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: selectedIncident ? '#9b1c26' : '#d1d5db', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>3</div>
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
        <div>
          <label style={lbl}>Complementação (opcional)</label>
          <textarea
            style={{ ...inp, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="Descreva informações adicionais sobre as ações tomadas..."
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

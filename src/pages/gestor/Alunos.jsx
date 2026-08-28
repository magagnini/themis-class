import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { showToast } from '../../components/ui/Toast';
import { Plus, Search, User, Trash2, FileSpreadsheet, X, Loader2, Upload, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function GestorAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', enrollment: '', shift: 'Manhã', class_id: '' });

  // Importação
  const fileInputRef = useRef(null);
  const [alunosParaImportar, setAlunosParaImportar] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [turmaImportacao, setTurmaImportacao] = useState('');
  const [importing, setImporting] = useState(false);

  // Detalhes do Aluno (Histórico 15 dias)
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState(null);
  const [alunoHistory, setAlunoHistory] = useState({ recent: [], old_count: 0, loading: false });

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: currentProfile } = await supabase.from('profiles').select('school_id').eq('id', userData.user.id).single();
    if (!currentProfile?.school_id) return;

    // Buscar turmas
    const { data: classData } = await supabase.from('classes').select('*').eq('school_id', currentProfile.school_id);
    setClasses(classData || []);

    // Buscar alunos
    const { data: studentData } = await supabase.from('students')
      .select('*, class_students(class_id)')
      .eq('school_id', currentProfile.school_id)
      .order('name');
    
    // Mapear turma atual
    const mapped = (studentData || []).map(s => {
      const classId = s.class_students?.[0]?.class_id;
      const t = classData?.find(c => c.id === classId);
      return { ...s, turma_nome: t ? t.name : 'Sem Turma' };
    });

    setAlunos(mapped);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.class_id) {
      return showToast('Nome e Turma são obrigatórios.', 'error');
    }
    setSaving(true);
    
    const { data: userData } = await supabase.auth.getUser();
    const { data: currentProfile } = await supabase.from('profiles').select('school_id').eq('id', userData.user.id).single();

    const { data: newStudent, error: studentError } = await supabase.from('students').insert([{
      school_id: currentProfile.school_id,
      name: form.name,
      enrollment: form.enrollment,
      shift: form.shift,
      status: 'active'
    }]).select().single();

    if (studentError) {
      showToast('Erro ao criar aluno: ' + studentError.message, 'error');
    } else {
      await supabase.from('class_students').insert([{ student_id: newStudent.id, class_id: form.class_id }]);
      showToast('Aluno cadastrado com sucesso!');
      setShowModal(false);
      setForm({ name: '', enrollment: '', shift: 'Manhã', class_id: '' });
      fetchData();
    }
    setSaving(false);
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        let alunosTemp = [];
        // Busca simples assumindo Nome na coluna 1 (índice 0) ou algo parecido.
        // Tentar detectar cabeçalho
        let headerRowIndex = data.findIndex(row => row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('nome')));
        if (headerRowIndex === -1) headerRowIndex = 0; // fallback

        const colNome = data[headerRowIndex].findIndex(c => typeof c === 'string' && c.toLowerCase().includes('nome'));
        let colMatricula = data[headerRowIndex].findIndex(c => typeof c === 'string' && (c.toLowerCase().includes('mat') || c.toLowerCase().includes('ra')));
        
        alunosTemp = data.slice(headerRowIndex + 1)
          .filter(row => row[colNome >= 0 ? colNome : 0]) 
          .map(row => ({
            nome: row[colNome >= 0 ? colNome : 0]?.toString().trim() || '',
            matricula: colMatricula >= 0 ? (row[colMatricula]?.toString().trim() || 'SEM_RA') : 'SEM_RA',
          }));

        setAlunosParaImportar(alunosTemp);
        setShowImportModal(true);
      } catch (error) {
        console.error('Erro ao processar planilha:', error);
        showToast('Erro ao carregar planilha. Verifique o formato.', 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (alunosParaImportar.length === 0 || !turmaImportacao) {
      return showToast('Selecione uma turma para os alunos.', 'error');
    }

    setImporting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: currentProfile } = await supabase.from('profiles').select('school_id').eq('id', userData.user.id).single();

      const studentsToInsert = alunosParaImportar.map(a => ({
        school_id: currentProfile.school_id,
        name: a.nome,
        enrollment: a.matricula,
        shift: 'Manhã',
        status: 'active'
      }));

      const { data: inserted, error: insertError } = await supabase.from('students').insert(studentsToInsert).select();
      if (insertError) throw insertError;

      const relations = inserted.map(s => ({
        student_id: s.id,
        class_id: turmaImportacao
      }));

      await supabase.from('class_students').insert(relations);

      showToast(`${alunosParaImportar.length} alunos importados com sucesso!`);
      setShowImportModal(false);
      setAlunosParaImportar([]);
      setTurmaImportacao('');
      fetchData();
    } catch (error) {
      console.error(error);
      showToast('Erro ao importar alunos.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const openHistory = async (aluno) => {
    setSelectedAluno(aluno);
    setShowHistoryModal(true);
    setAlunoHistory({ recent: [], old_count: 0, loading: true });

    // Buscar ocorrências do aluno
    const { data: incidents } = await supabase.from('incidents')
      .select('*, incident_types(name)')
      .eq('student_id', aluno.id)
      .order('incident_date', { ascending: false });
    
    if (incidents) {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const recent = [];
      let oldCount = 0;

      incidents.forEach(inc => {
        const d = new Date(inc.incident_date);
        if (d >= fifteenDaysAgo) {
          recent.push(inc);
        } else {
          oldCount++;
        }
      });

      setAlunoHistory({ recent, old_count: oldCount, loading: false });
    } else {
      setAlunoHistory({ recent: [], old_count: 0, loading: false });
    }
  };

  const filtered = alunos.filter(a => a.name.toLowerCase().includes(busca.toLowerCase()));

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
  const lbl = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '500' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: 0 }}>Gestão de Alunos</h1>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
          <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px 16px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}>
            <FileSpreadsheet size={18} /> Importar Planilha
          </button>
          
          <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
            <Plus size={18} /> Novo Aluno
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.5rem', width: '300px' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#6b7280' }} size={20} />
        <input type="text" placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)}
          style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Nome', 'Matrícula', 'Turma', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Nenhum aluno encontrado.</td></tr>
              ) : filtered.map(aluno => (
                <tr key={aluno.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '500', color: '#111827', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="#6b7280"/></div>
                    {aluno.name}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{aluno.enrollment || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{aluno.turma_nome}</td>
                  <td style={{ padding: '14px 16px' }}><Badge type={aluno.status}>{aluno.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => openHistory(aluno)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#374151', fontWeight: '500' }}>
                      <Eye size={14} /> Histórico
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Novo Aluno */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Cadastrar Aluno">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={lbl}>Nome Completo *</label>
            <input type="text" style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Matrícula (RA)</label>
              <input type="text" style={inp} value={form.enrollment} onChange={e => setForm(p => ({ ...p, enrollment: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Turno</label>
              <select style={inp} value={form.shift} onChange={e => setForm(p => ({ ...p, shift: e.target.value }))}>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Turma *</label>
            <select style={inp} value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}>
              <option value="">Selecione uma turma...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {saving ? <Loader2 size={16} className="animar-giro" /> : null}
              {saving ? 'Criando...' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Importar */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Confirmar Importação" size="lg">
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '14px' }}>
          Foram detectados <strong>{alunosParaImportar.length} alunos</strong> na planilha. Para qual turma deseja importá-los?
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={lbl}>Turma de Destino *</label>
          <select style={inp} value={turmaImportacao} onChange={e => setTurmaImportacao(e.target.value)}>
            <option value="">Selecione uma turma...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Nome</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Matrícula</th>
              </tr>
            </thead>
            <tbody>
              {alunosParaImportar.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 12px', fontSize: '13px' }}>{a.nome}</td>
                  <td style={{ padding: '8px 12px', fontSize: '13px', color: '#6b7280' }}>{a.matricula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={() => setShowImportModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
          <button onClick={handleConfirmImport} disabled={importing} style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {importing ? <Loader2 size={16} className="animar-giro" /> : <Upload size={16} />}
            {importing ? 'Importando...' : 'Confirmar Importação'}
          </button>
        </div>
      </Modal>

      {/* Modal Histórico (15 dias) */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title={`Histórico: ${selectedAluno?.name}`}>
        {alunoHistory.loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Turma Atual</div>
                <div style={{ fontWeight: '600' }}>{selectedAluno?.turma_nome}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Ocorrências Antigas (&gt;15 dias)</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#9b1c26' }}>{alunoHistory.old_count}</div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '14px' }}>Ocorrências Recentes (Últimos 15 dias)</h4>
            
            {alunoHistory.recent.length === 0 ? (
              <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '6px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                O aluno não possui ocorrências nos últimos 15 dias.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {alunoHistory.recent.map(inc => (
                  <div key={inc.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>{inc.incident_types?.name || 'Geral'}</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(inc.incident_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>{inc.description}</p>
                    <div style={{ marginTop: '8px' }}><Badge type={inc.status}>{inc.status}</Badge></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animar-giro { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}

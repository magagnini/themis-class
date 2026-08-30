import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { showToast } from '../../components/ui/Toast';
import { Plus, Search, User, Trash2, FileSpreadsheet, Loader2, Upload, Eye, Phone, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

function formatBrazilPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return '+' + digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return '+55' + digits;
  }
  return '+' + (digits.startsWith('55') ? digits : '55' + digits);
}

export default function GestorAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schoolId, setSchoolId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', enrollment: '', shift: 'Manhã', turma_texto: '', guardian_name: '', guardian_phone: '' });

  // Importação
  const fileInputRef = useRef(null);
  const [alunosParaImportar, setAlunosParaImportar] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importTurmaDefault, setImportTurmaDefault] = useState('');

  // Histórico
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState(null);
  const [alunoHistory, setAlunoHistory] = useState({ recent: [], old_count: 0, loading: false });

  useEffect(() => { fetchData(); }, []);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nome do aluno', 'RA', 'Turma', 'Nome do responsável', 'Número do responsável'],
      ['VINICIUS SILVA', '123456', '2º ANO A', 'MARIA SILVA', '11999999999']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'Modelo_Alunos.xlsx');
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: currentProfile } = await supabase.from('profiles').select('school_id').eq('id', userData.user.id).single();
    if (!currentProfile?.school_id) return;

    setSchoolId(currentProfile.school_id);

    const { data: classData } = await supabase.from('classes').select('*').eq('school_id', currentProfile.school_id).order('name');
    setClasses(classData || []);

    const { data: studentData } = await supabase
      .from('students')
      .select('*, class_students(class_id, classes(name))')
      .eq('school_id', currentProfile.school_id)
      .order('name');

    const mapped = (studentData || []).map(s => {
      const classId = s.class_students?.[0]?.class_id;
      const t = (classData || []).find(c => c.id === classId);
      return { ...s, turma_nome: t ? t.name : (s.class_students?.[0]?.classes?.name || 'Sem Turma') };
    });

    setAlunos(mapped);
    setLoading(false);
  };

  const shiftToDb = { 'Manhã': 'morning', 'Tarde': 'afternoon', 'Noite': 'night' };

  const handleSave = async () => {
    if (!form.name.trim() || !form.turma_texto.trim()) {
      return showToast('Nome e Turma são obrigatórios.', 'error');
    }
    setSaving(true);

    // Criar/obter turma com normalização
    const classId = await findOrCreateClass(form.turma_texto.trim());

    const { data: newStudent, error: studentError } = await supabase.from('students').insert([{
      school_id: schoolId,
      name: form.name,
      enrollment: form.enrollment,
      shift: shiftToDb[form.shift] || 'morning',
      guardian_name: form.guardian_name,
      guardian_phone: formatBrazilPhone(form.guardian_phone),
      status: 'active'
    }]).select().single();

    if (studentError) {
      showToast('Erro ao criar aluno: ' + studentError.message, 'error');
    } else {
      if (classId) {
        await supabase.from('class_students').insert([{ student_id: newStudent.id, class_id: classId, school_id: schoolId }]);
      }
      showToast('Aluno cadastrado com sucesso!');
      setShowModal(false);
      setForm({ name: '', enrollment: '', shift: 'Manhã', turma_texto: '', guardian_name: '', guardian_phone: '' });
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

        // Detectar cabeçalho automaticamente (igual ao Atheneum Lib)
        let headerRowIndex = -1;
        let colNome = -1, colRA = -1, colDigRA = -1, colUF = -1, colNascimento = -1, colTurma = -1, colResponsavel = -1, colTelefone = -1;

        for (let i = 0; i < Math.min(20, data.length); i++) {
          const row = data[i];
          if (!Array.isArray(row)) continue;
          const idxNome = row.findIndex(c => typeof c === 'string' && c.toLowerCase().includes('nome'));
          if (idxNome !== -1) {
            headerRowIndex = i;
            colNome = idxNome;
            colRA = row.findIndex(c => typeof c === 'string' && c.trim().toUpperCase() === 'RA');
            colDigRA = row.findIndex(c => typeof c === 'string' && c.toLowerCase().includes('dig'));
            colUF = row.findIndex(c => typeof c === 'string' && c.toLowerCase().includes('uf'));
            colNascimento = row.findIndex(c => typeof c === 'string' && c.toLowerCase().includes('nasc'));
            colTurma = row.findIndex(c => typeof c === 'string' && (c.toLowerCase().includes('turma') || c.toLowerCase().includes('série') || c.toLowerCase().includes('serie')));
            colResponsavel = row.findIndex(c => typeof c === 'string' && (c.toLowerCase().includes('responsável') || c.toLowerCase().includes('responsavel')));
            colTelefone = row.findIndex(c => typeof c === 'string' && (c.toLowerCase().includes('telefone') || c.toLowerCase().includes('celular') || c.toLowerCase().includes('whatsapp') || c.toLowerCase().includes('fone')));
            break;
          }
        }

        let alunosTemp = [];

        if (headerRowIndex !== -1 && colNome !== -1) {
          alunosTemp = data.slice(headerRowIndex + 1)
            .filter(row => row[colNome])
            .map(row => {
              let matricula = '';
              if (colRA !== -1 && row[colRA] !== undefined) {
                matricula += row[colRA].toString().trim();
                if (colDigRA !== -1 && row[colDigRA] !== undefined) matricula += row[colDigRA].toString().trim();
                if (colUF !== -1 && row[colUF] !== undefined) matricula += row[colUF].toString().trim();
              } else {
                matricula = (row[colNome + 1] || '').toString().trim();
              }
              return {
                nome: row[colNome]?.toString().trim() || '',
                matricula: matricula || 'SEM_RA',
                turma: colTurma !== -1 ? (row[colTurma]?.toString().trim() || '') : '',
                guardian_name: colResponsavel !== -1 ? (row[colResponsavel]?.toString().trim() || '') : '',
                guardian_phone: colTelefone !== -1 ? (row[colTelefone]?.toString().trim() || '') : '',
              };
            });
        } else {
          // Fallback simples
          alunosTemp = data.slice(1).filter(row => row[0]).map(row => ({
            nome: row[0]?.toString().trim() || '',
            matricula: row[1]?.toString().trim() || 'SEM_RA',
            turma: row[2]?.toString().trim() || '',
            guardian_name: row[3]?.toString().trim() || '',
            guardian_phone: row[4]?.toString().trim() || '',
          }));
        }

        setAlunosParaImportar(alunosTemp);
        setImportTurmaDefault('');
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

  // Normalizar nome de turma: remove º/°, espaços extras, deixa MAIÚSCULO para comparação
  const normalizeClassName = (name) => {
    if (!name) return '';
    return name
      .trim()
      .replace(/[°º]/g, '')      // Remove graus ordinais
      .replace(/\s+/g, ' ')      // Colapsa espaços múltiplos
      .trim()
      .toUpperCase();
  };

  // Criar ou reutilizar turma por nome — case insensitive com normalização de º/°
  const findOrCreateClass = async (className) => {
    if (!className || !className.trim()) return null;
    const nameNorm = normalizeClassName(className);

    // Buscar TODAS as turmas da escola para comparar com normalização local
    const { data: allClasses } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', schoolId);

    if (allClasses) {
      const match = allClasses.find(c => normalizeClassName(c.name) === nameNorm);
      if (match) return match.id;
    }

    // Criar nova turma preservando o nome original como digitado
    const { data: created, error } = await supabase
      .from('classes')
      .insert([{ school_id: schoolId, name: className.trim(), active: true }])
      .select('id')
      .single();

    if (error) {
      // Race condition: buscar novamente
      const { data: allClasses2 } = await supabase.from('classes').select('id, name').eq('school_id', schoolId);
      const match2 = allClasses2?.find(c => normalizeClassName(c.name) === nameNorm);
      return match2?.id || null;
    }
    return created.id;
  };

  const handleConfirmImport = async () => {
    if (alunosParaImportar.length === 0) return showToast('Nenhum aluno para importar.', 'error');

    // Verificar se algum aluno tem turma indefinida e não há campo de turma preenchido
    const semTurma = alunosParaImportar.filter(a => !a.turma || !a.turma.trim());
    if (semTurma.length > 0 && !importTurmaDefault.trim()) {
      return showToast(`${semTurma.length} aluno(s) sem turma definida. Informe a turma no campo abaixo ou verifique a planilha.`, 'error');
    }

    setImporting(true);
    try {
      let importados = 0;
      let ignorados = 0;

      for (const aluno of alunosParaImportar) {
        // Verificar duplicata (mesmo nome + escola)
        const { data: existing } = await supabase.from('students').select('id').eq('school_id', schoolId).eq('name', aluno.nome).maybeSingle();
        if (existing) { ignorados++; continue; }

        const turmaToUse = aluno.turma?.trim() || importTurmaDefault.trim();
        const classId = await findOrCreateClass(turmaToUse);

        // Criar aluno
        const { data: newStudent, error: studentError } = await supabase.from('students').insert([{
          school_id: schoolId,
          name: aluno.nome,
          enrollment: aluno.matricula,
          guardian_name: aluno.guardian_name || null,
          guardian_phone: formatBrazilPhone(aluno.guardian_phone),
          shift: 'morning',
          status: 'active'
        }]).select().single();

        if (studentError) { console.error('Erro ao inserir aluno:', studentError); continue; }

        // Vincular à turma
        if (classId) {
          await supabase.from('class_students').insert([{ student_id: newStudent.id, class_id: classId, school_id: schoolId }]);
        }

        importados++;
      }

      showToast(`${importados} aluno(s) importado(s) com sucesso! ${ignorados > 0 ? `(${ignorados} já existiam e foram ignorados)` : ''}`);
      setShowImportModal(false);
      setAlunosParaImportar([]);
      fetchData();
    } catch (error) {
      console.error(error);
      showToast('Erro ao importar alunos: ' + error.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const openHistory = async (aluno) => {
    setSelectedAluno(aluno);
    setShowHistoryModal(true);
    setAlunoHistory({ recent: [], old_count: 0, loading: true });

    const { data: incidents } = await supabase.from('incidents')
      .select('*, incident_types(name)')
      .eq('student_id', aluno.id)
      .order('incident_date', { ascending: false });

    if (incidents) {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const recent = [], old = [];
      incidents.forEach(inc => {
        if (new Date(inc.incident_date) >= fifteenDaysAgo) recent.push(inc);
        else old.push(inc);
      });
      setAlunoHistory({ recent, old_count: old.length, loading: false });
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
          <button onClick={handleDownloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px 16px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}>
            <Download size={18} /> Baixar planilha padrão
          </button>
          <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
            <Plus size={18} /> Novo Aluno
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '320px' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#6b7280' }} size={20} />
        <input type="text" placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)}
          style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Nome', 'Matrícula', 'Turma', 'Responsável', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Nenhum aluno encontrado.</td></tr>
              ) : filtered.map(aluno => (
                <tr key={aluno.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="#6b7280" /></div>
                      <span style={{ fontWeight: '500', color: '#111827' }}>{aluno.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{aluno.enrollment || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#374151', fontSize: '14px' }}>{aluno.turma_nome}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                    {aluno.guardian_name ? (
                      <div>
                        <div style={{ fontWeight: '500', color: '#374151' }}>{aluno.guardian_name}</div>
                        {aluno.guardian_phone && (
                          <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={11} />{aluno.guardian_phone}</div>
                        )}
                      </div>
                    ) : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}><Badge type={aluno.status || 'active'}>{aluno.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></td>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label style={lbl}>Nome Completo *</label>
            <input type="text" style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ flex: 1 }}><label style={lbl}>Matrícula (RA)</label>
              <input type="text" style={inp} value={form.enrollment} onChange={e => setForm(p => ({ ...p, enrollment: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}><label style={lbl}>Turno</label>
              <select style={inp} value={form.shift} onChange={e => setForm(p => ({ ...p, shift: e.target.value }))}>
                <option>Manhã</option><option>Tarde</option><option>Noite</option>
              </select>
            </div>
          </div>
          <div><label style={lbl}>Turma *</label>
            <input type="text" style={inp} placeholder="Ex: 6° Ano A, 3° B, Turma 2..." value={form.turma_texto} onChange={e => setForm(p => ({ ...p, turma_texto: e.target.value }))} />
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#9ca3af' }}>A turma será criada automaticamente se não existir. A busca é insensível a maiúsculas/minúsculas.</p>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />
          <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Dados do Responsável</p>
          <div><label style={lbl}>Nome do Responsável</label>
            <input type="text" style={inp} placeholder="Nome do pai, mãe ou responsável" value={form.guardian_name} onChange={e => setForm(p => ({ ...p, guardian_name: e.target.value }))} />
          </div>
          <div><label style={lbl}>WhatsApp / Telefone do Responsável</label>
            <input type="text" style={inp} placeholder="(11) 99999-9999" value={form.guardian_phone} onChange={e => setForm(p => ({ ...p, guardian_phone: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {saving ? <Loader2 size={16} className="animar-giro" /> : null}{saving ? 'Criando...' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Importação */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title={`Confirmar Importação — ${alunosParaImportar.length} alunos`} size="lg">
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#166534' }}>
          <strong>Turmas identificadas automaticamente</strong> na planilha. Cada aluno será vinculado à sua turma, que será criada no sistema se ainda não existir. Alunos já cadastrados serão ignorados.
        </div>

        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb' }}>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {['Nome', 'Matrícula', 'Turma', 'Responsável', 'Telefone'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alunosParaImportar.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 12px', fontSize: '13px' }}>{a.nome}</td>
                  <td style={{ padding: '8px 12px', fontSize: '13px', color: '#6b7280' }}>{a.matricula}</td>
                  <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                    {a.turma ? <span style={{ backgroundColor: '#fdf2f2', color: '#9b1c26', padding: '2px 8px', borderRadius: '10px', fontWeight: '600', fontSize: '12px' }}>{a.turma}</span> : <span style={{ color: '#ef4444', fontSize: '12px' }}>⚠ Sem turma</span>}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: '13px', color: '#6b7280' }}>{a.guardian_name || '—'}</td>
                  <td style={{ padding: '8px 12px', fontSize: '13px', color: '#6b7280' }}>{a.guardian_phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {alunosParaImportar.some(a => !a.turma || !a.turma.trim()) && (
          <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '8px', color: '#374151' }}>
              Definir turma para esta importação
            </label>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280' }}>
              A planilha não possui a informação de turma. Informe a turma que será atribuída aos alunos desta importação.
            </p>
            <input
              type="text"
              placeholder="Digite a turma (Ex: 2º ANO A)"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              value={importTurmaDefault}
              onChange={e => setImportTurmaDefault(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={() => setShowImportModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
          <button onClick={handleConfirmImport} disabled={importing} style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {importing ? <Loader2 size={16} className="animar-giro" /> : <Upload size={16} />}
            {importing ? 'Importando...' : 'Confirmar Importação'}
          </button>
        </div>
      </Modal>

      {/* Modal Histórico */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title={`Histórico: ${selectedAluno?.name}`}>
        {alunoHistory.loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Turma</div>
                <div style={{ fontWeight: '600' }}>{selectedAluno?.turma_nome}</div>
                {selectedAluno?.guardian_name && (
                  <div style={{ marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>
                    Resp: {selectedAluno.guardian_name} {selectedAluno.guardian_phone && `— ${selectedAluno.guardian_phone}`}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Ocorrências &gt; 15 dias</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#9b1c26' }}>{alunoHistory.old_count}</div>
              </div>
            </div>
            <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '14px' }}>Últimos 15 dias</h4>
            {alunoHistory.recent.length === 0 ? (
              <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '6px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                Sem ocorrências nos últimos 15 dias.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {alunoHistory.recent.map(inc => {
                  const types = inc.incident_types_list || [];
                  return (
                    <div key={inc.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {types.length > 0 ? types.map((t, i) => (
                            <span key={i} style={{ backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '20px', padding: '2px 8px', fontSize: '12px', fontWeight: '600' }}>{t.label}</span>
                          )) : <span style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>{inc.description || 'Ocorrência'}</span>}
                        </div>
                        <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{new Date(inc.incident_date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {inc.subject && <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280' }}>Disciplina: {inc.subject}</p>}
                      {inc.outros_description && <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', fontStyle: 'italic' }}>{inc.outros_description}</p>}
                      <div style={{ marginTop: '8px' }}><Badge type={inc.status}>{inc.status}</Badge></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animar-giro { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}

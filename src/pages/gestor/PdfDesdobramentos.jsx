import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import jsPDF from 'jspdf';
import { Loader2, FileText, Download, CheckSquare, Square, Search, Calendar, Users } from 'lucide-react';

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d + (d.includes('T') ? '' : 'T12:00'));
  return date.toLocaleDateString('pt-BR');
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function getIncidentLabel(incident) {
  if (!incident) return '—';
  const types = incident.incident_types_list;
  if (Array.isArray(types) && types.length > 0) {
    return types.map((t) => t.label || t.name || '').filter(Boolean).join(', ');
  }
  return '—';
}

function getStudentClass(student) {
  try {
    return student?.class_students?.[0]?.classes?.name || '—';
  } catch {
    return '—';
  }
}

function collectFollowupLabels(row) {
  return [row.ft1, row.ft2, row.ft3, row.ft4]
    .filter(Boolean)
    .map((f) => f.name)
    .filter(Boolean);
}

export default function PdfDesdobramentos() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState('Escola');
  const [followups, setFollowups] = useState([]);
  const [classes, setClasses] = useState([]);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  const inpStyle = {
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#111827',
    backgroundColor: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, schools(name)')
        .eq('id', user.id)
        .single();

      if (profile?.school_id) {
        setSchoolId(profile.school_id);
        setSchoolName(profile.schools?.name || 'Escola');
        await Promise.all([
          fetchFollowups(profile.school_id),
          fetchClasses(profile.school_id),
        ]);
      }
      setLoading(false);
    };
    init();
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const fetchFollowups = async (sid) => {
    try {
      const { data, error } = await supabase
        .from('followups')
        .select(`
          *,
          students(name, enrollment, class_students(classes(name))),
          profiles(name),
          ft1:followup_1(name),
          ft2:followup_2(name),
          ft3:followup_3(name),
          ft4:followup_4(name),
          incidents(incident_date, incident_date_only, incident_types_list, description)
        `)
        .eq('school_id', sid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowups(data || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar desdobramentos: ' + err.message, 'error');
    }
  };

  const fetchClasses = async (sid) => {
    const { data } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', sid)
      .eq('active', true)
      .order('name');
    setClasses(data || []);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = followups.filter((row) => {
    const name = row.students?.name?.toLowerCase() || '';
    if (searchName && !name.includes(searchName.toLowerCase())) return false;

    if (startDate || endDate) {
      const dateStr = row.created_at ? row.created_at.split('T')[0] : '';
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
    }

    if (classFilter) {
      const cls = getStudentClass(row.students);
      if (cls !== classFilter) return false;
    }

    return true;
  });

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;

  // ── PDF generation ────────────────────────────────────────────────────────
  const handleGeneratePDF = () => {
    if (!someSelected) {
      return showToast('Selecione ao menos um desdobramento.', 'error');
    }

    const rows = followups.filter((r) => selectedIds.has(r.id));
    if (rows.length === 0) return;

    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const marginL = 20;
      const marginR = 20;
      const contentW = pageW - marginL - marginR;

      const WINE = [155, 28, 38];
      const DARK = [17, 24, 39];
      const GRAY = [107, 114, 128];
      const LIGHT = [249, 250, 251];

      rows.forEach((row, idx) => {
        if (idx > 0) doc.addPage();

        let y = 18;

        // School header band
        doc.setFillColor(...WINE);
        doc.rect(0, 0, pageW, 14, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(schoolName.toUpperCase(), marginL, 9.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text('DESDOBRAMENTO DE OCORRÊNCIA', pageW - marginR, 9.5, { align: 'right' });

        y = 22;

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...DARK);
        doc.text('Registro de Desdobramento', marginL, y);
        y += 8;

        // Student + class row
        const studentName = row.students?.name || '—';
        const className = getStudentClass(row.students);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...DARK);
        doc.text(`Aluno: `, marginL, y);
        doc.setFont('helvetica', 'bold');
        doc.text(studentName, marginL + 13, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`   Turma: `, marginL + 13 + doc.getTextWidth(studentName), y);
        doc.setFont('helvetica', 'bold');
        const afterTurma = marginL + 13 + doc.getTextWidth(studentName) + 13;
        doc.text(className, afterTurma, y);
        y += 7;

        // Divider
        doc.setDrawColor(...WINE);
        doc.setLineWidth(0.5);
        doc.line(marginL, y, pageW - marginR, y);
        y += 6;

        // Ocorrência section
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        doc.text('OCORRÊNCIA RELACIONADA', marginL, y);
        y += 5;

        doc.setFillColor(...LIGHT);
        doc.roundedRect(marginL, y - 1, contentW, 16, 2, 2, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...DARK);
        const incLabel = getIncidentLabel(row.incidents);
        const incDateStr = fmtDate(row.incidents?.incident_date_only || row.incidents?.incident_date);
        const incLabelLines = doc.splitTextToSize(`Tipos: ${incLabel}`, contentW - 8);
        incLabelLines.forEach((line, li) => {
          doc.text(line, marginL + 4, y + 4 + li * 5);
        });
        doc.text(`Data: ${incDateStr}`, pageW - marginR - 4, y + 4, { align: 'right' });
        y += 4 + incLabelLines.length * 5 + 5;

        // Desdobramentos section
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        doc.text('DESDOBRAMENTOS', marginL, y);
        y += 5;

        const fupLabels = collectFollowupLabels(row);
        if (fupLabels.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          doc.setTextColor(...GRAY);
          doc.text('Nenhum desdobramento selecionado.', marginL + 4, y + 4);
          y += 12;
        } else {
          fupLabels.forEach((label, li) => {
            doc.setFillColor(255, 242, 242);
            doc.roundedRect(marginL, y - 1, contentW, 8, 1.5, 1.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(...WINE);
            doc.text(`D${li + 1}`, marginL + 3, y + 4.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...DARK);
            doc.text(label, marginL + 10, y + 4.5);
            y += 10;
          });
        }

        y += 2;

        // Complementação section
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        doc.text('COMPLEMENTAÇÃO', marginL, y);
        y += 5;

        const compText = row.complementacao || 'Nenhuma';
        const compLines = doc.splitTextToSize(compText, contentW - 8);
        const compBlockH = Math.max(16, compLines.length * 5 + 8);
        doc.setFillColor(...LIGHT);
        doc.roundedRect(marginL, y - 1, contentW, compBlockH, 2, 2, 'F');
        doc.setFont('helvetica', row.complementacao ? 'normal' : 'italic');
        doc.setFontSize(10);
        doc.setTextColor(row.complementacao ? DARK[0] : GRAY[0], row.complementacao ? DARK[1] : GRAY[1], row.complementacao ? DARK[2] : GRAY[2]);
        compLines.forEach((line, li) => {
          doc.text(line, marginL + 4, y + 5 + li * 5);
        });
        y += compBlockH + 6;

        // Footer meta
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.line(marginL, y, pageW - marginR, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        doc.text(`Registrado por: ${row.profiles?.name || '—'}`, marginL, y);
        doc.text(`Data do desdobramento: ${fmtDateTime(row.created_at)}`, pageW - marginR, y, { align: 'right' });
        y += 12;

        // Signature line
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...DARK);
        doc.text('Ass: _______________________________________________', marginL, y);

        // Page footer
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFillColor(...WINE);
        doc.rect(0, pageH - 8, pageW, 8, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(`Themis Class — ${schoolName}`, marginL, pageH - 3);
        doc.text(`Página ${idx + 1} de ${rows.length}`, pageW - marginR, pageH - 3, { align: 'right' });
      });

      doc.save('desdobramentos.pdf');
      showToast(`PDF gerado com ${rows.length} desdobramento${rows.length !== 1 ? 's' : ''}!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar PDF: ' + err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 4px 0' }}>
            PDF Desdobramentos
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            Selecione os desdobramentos para incluir no relatório PDF.
          </p>
        </div>
        <button
          onClick={handleGeneratePDF}
          disabled={!someSelected || generating}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 22px', backgroundColor: someSelected && !generating ? '#9b1c26' : '#e5e7eb',
            color: someSelected && !generating ? '#fff' : '#9ca3af',
            border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px',
            cursor: someSelected && !generating ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          {generating
            ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            : <Download size={16} />}
          {generating ? 'Gerando...' : `GERAR PDF${someSelected ? ` (${selectedIds.size})` : ''}`}
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        background: '#fff', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        padding: '16px 20px', marginBottom: '20px',
        display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '5px', textTransform: 'uppercase' }}>
            <Search size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Aluno
          </label>
          <input
            type="text"
            placeholder="Buscar por nome..."
            style={inpStyle}
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div style={{ flex: '0 1 160px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '5px', textTransform: 'uppercase' }}>
            <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Data Inicial
          </label>
          <input type="date" style={inpStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div style={{ flex: '0 1 160px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '5px', textTransform: 'uppercase' }}>
            <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Data Final
          </label>
          <input type="date" style={inpStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div style={{ flex: '0 1 180px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '5px', textTransform: 'uppercase' }}>
            <Users size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Turma
          </label>
          <select style={inpStyle} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">Todas as turmas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        {(searchName || startDate || endDate || classFilter) && (
          <button
            onClick={() => { setSearchName(''); setStartDate(''); setEndDate(''); setClassFilter(''); }}
            style={{ padding: '9px 14px', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2', color: '#9b1c26', cursor: 'pointer', fontSize: '13px', fontWeight: '600', alignSelf: 'flex-end' }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Toolbar */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px', fontSize: '13px', color: '#374151' }}>
          <button
            onClick={toggleSelectAll}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: '#374151' }}
          >
            {allSelected ? <CheckSquare size={14} color="#9b1c26" /> : <Square size={14} />}
            {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          {someSelected && (
            <span style={{ color: '#9b1c26', fontWeight: '600' }}>
              {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
          )}
          <span style={{ color: '#9ca3af' }}>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
            <FileText size={48} color="#d1d5db" style={{ marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 4px 0', fontWeight: '500' }}>Nenhum desdobramento encontrado.</p>
            {followups.length > 0 && <p style={{ margin: 0, fontSize: '13px' }}>Tente ajustar os filtros.</p>}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', width: '40px' }}>
                  <button
                    onClick={toggleSelectAll}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                  >
                    {allSelected
                      ? <CheckSquare size={18} color="#9b1c26" />
                      : <Square size={18} color="#9ca3af" />}
                  </button>
                </th>
                {['Data', 'Aluno', 'Turma', 'Ocorrência', 'Desdobramentos', 'Usuário'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isSelected = selectedIds.has(row.id);
                const fupLabels = collectFollowupLabels(row);
                const className = getStudentClass(row.students);
                return (
                  <tr
                    key={row.id}
                    onClick={() => toggleSelect(row.id)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#fff7f7' : '#fff',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? '#fff7f7' : '#fff'; }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      {isSelected
                        ? <CheckSquare size={18} color="#9b1c26" />
                        : <Square size={18} color="#d1d5db" />}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {fmtDate(row.created_at ? row.created_at.split('T')[0] : null)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {row.students?.name || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>
                      {className}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151', maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getIncidentLabel(row.incidents)}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                      {fupLabels.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {fupLabels.map((n, i) => (
                            <span key={i} style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#fef2f2', color: '#9b1c26' }}>
                              {n}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Nenhum</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                      {row.profiles?.name || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Loader2, Filter, Calendar, User, ChevronRight, ClipboardList } from 'lucide-react';

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
  let label = '—';
  if (Array.isArray(types) && types.length > 0) {
    label = types.map((t) => t.label || t.name || '').filter(Boolean).join(', ');
  }
  return label;
}

function collectFollowupNames(row) {
  const fups = [row.ft1, row.ft2, row.ft3, row.ft4]
    .filter(Boolean)
    .map((f) => f.name)
    .filter(Boolean);
  return fups.length > 0 ? fups : null;
}

export default function Desdobramentos() {
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal
  const [selectedRow, setSelectedRow] = useState(null);

  const inpStyle = {
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#111827',
    backgroundColor: '#fff',
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profile?.school_id) {
        setSchoolId(profile.school_id);
        await fetchFollowups(profile.school_id);
      }
      setLoading(false);
    };
    init();
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchFollowups = async (sid) => {
    setLoading(true);
    try {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      fifteenDaysAgo.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('followups')
        .select(`
          *,
          students(name),
          profiles(name),
          ft1:followup_1(name),
          ft2:followup_2(name),
          ft3:followup_3(name),
          ft4:followup_4(name),
          incidents(incident_date, incident_date_only, incident_types_list)
        `)
        .eq('school_id', sid)
        .gte('created_at', fifteenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowups(data || []);

      // Also fetch total count (all time) for the badge
      const { count } = await supabase
        .from('followups')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', sid);
      setTotalCount(count || 0);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar desdobramentos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = followups.filter((row) => {
    const name = row.students?.name?.toLowerCase() || '';
    if (searchName && !name.includes(searchName.toLowerCase())) return false;

    if (startDate || endDate) {
      const createdAt = row.created_at ? row.created_at.split('T')[0] : '';
      if (startDate && createdAt < startDate) return false;
      if (endDate && createdAt > endDate) return false;
    }
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 4px 0' }}>
            Desdobramentos
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            Exibindo registros dos últimos 15 dias
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
            backgroundColor: '#fef2f2', color: '#9b1c26', border: '1px solid #fecaca',
          }}>
            Total histórico: {totalCount} desdobramento{totalCount !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => schoolId && fetchFollowups(schoolId)}
            disabled={loading}
            style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#374151' }}
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        background: '#fff', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        padding: '16px 20px', marginBottom: '20px',
        display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <User size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Aluno
          </label>
          <input
            type="text"
            placeholder="Buscar por nome do aluno..."
            style={{ ...inpStyle, width: '100%', boxSizing: 'border-box' }}
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div style={{ flex: '0 1 160px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Data Inicial
          </label>
          <input type="date" style={{ ...inpStyle, width: '100%', boxSizing: 'border-box' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div style={{ flex: '0 1 160px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Data Final
          </label>
          <input type="date" style={{ ...inpStyle, width: '100%', boxSizing: 'border-box' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        {(searchName || startDate || endDate) && (
          <button
            onClick={() => { setSearchName(''); setStartDate(''); setEndDate(''); }}
            style={{ padding: '9px 14px', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2', color: '#9b1c26', cursor: 'pointer', fontSize: '13px', fontWeight: '600', alignSelf: 'flex-end' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
          <Filter size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
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
            <ClipboardList size={48} color="#d1d5db" style={{ marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 4px 0', fontWeight: '500' }}>Nenhum desdobramento encontrado.</p>
            <p style={{ margin: 0, fontSize: '13px' }}>
              {followups.length === 0
                ? 'Nenhum desdobramento foi registrado nos últimos 15 dias.'
                : 'Tente ajustar os filtros.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Data', 'Aluno', 'Ocorrência', 'Desdobramentos', 'Usuário', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const fupNames = collectFollowupNames(row);
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {fmtDate(row.created_at ? row.created_at.split('T')[0] : null)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {row.students?.name || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151', maxWidth: '220px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getIncidentLabel(row.incidents)}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                      {fupNames ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {fupNames.map((n, i) => (
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
                    <td style={{ padding: '14px 16px' }}>
                      <ChevronRight size={16} color="#9ca3af" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRow && (
        <Modal isOpen={!!selectedRow} onClose={() => setSelectedRow(null)} title="Detalhes do Desdobramento" size="md">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <InfoRow label="Aluno" value={selectedRow.students?.name || '—'} />
            <InfoRow label="Ocorrência relacionada" value={getIncidentLabel(selectedRow.incidents)} />
            <InfoRow
              label="Data da ocorrência"
              value={fmtDate(
                selectedRow.incidents?.incident_date_only ||
                selectedRow.incidents?.incident_date
              )}
            />

            <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

            {[
              { label: 'Desdobramento 1', ft: selectedRow.ft1 },
              { label: 'Desdobramento 2', ft: selectedRow.ft2 },
              { label: 'Desdobramento 3', ft: selectedRow.ft3 },
              { label: 'Desdobramento 4', ft: selectedRow.ft4 },
            ].map(({ label, ft }) => (
              <InfoRow key={label} label={label} value={ft?.name || '—'} muted={!ft?.name} />
            ))}

            <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Complementação
              </div>
              <div style={{
                fontSize: '14px', color: selectedRow.complementacao ? '#111827' : '#9ca3af',
                fontStyle: selectedRow.complementacao ? 'normal' : 'italic',
                backgroundColor: '#f9fafb', borderRadius: '8px', padding: '12px 14px',
                lineHeight: '1.6',
              }}>
                {selectedRow.complementacao || 'Nenhuma'}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

            <InfoRow label="Registrado por" value={selectedRow.profiles?.name || '—'} />
            <InfoRow label="Data/hora do registro" value={fmtDateTime(selectedRow.created_at)} />
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function InfoRow({ label, value, muted = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', color: muted ? '#9ca3af' : '#111827', fontStyle: muted ? 'italic' : 'normal' }}>
        {value}
      </div>
    </div>
  );
}

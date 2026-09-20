import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { showToast } from '../../components/ui/Toast';
import { Loader2, Plus, Edit2, Globe } from 'lucide-react';

const EMPTY_FORM = { name: '', description: '', active: true };

export default function Desdobramentos() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('followup_types')
      .select('*')
      .is('school_id', null)
      .order('name');

    if (error) {
      showToast('Erro ao carregar tipos de desdobramento.', 'error');
    } else {
      setTypes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description || '', active: item.active });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
  };

  // ── Save (create / update) ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('O campo Nome é obrigatório.', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      school_id: null,
      is_global: true,
      name: form.name.trim(),
      description: form.description.trim() || null,
      active: form.active,
    };

    let error;
    if (editingItem) {
      ({ error } = await supabase
        .from('followup_types')
        .update(payload)
        .eq('id', editingItem.id));
    } else {
      ({ error } = await supabase.from('followup_types').insert(payload));
    }

    setSaving(false);

    if (error) {
      showToast('Erro ao salvar tipo de desdobramento.', 'error');
    } else {
      showToast(editingItem ? 'Tipo atualizado com sucesso.' : 'Tipo criado com sucesso.', 'success');
      closeModal();
      fetchTypes();
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggleActive = async (item) => {
    setTogglingId(item.id);
    const { error } = await supabase
      .from('followup_types')
      .update({ active: !item.active })
      .eq('id', item.id);

    setTogglingId(null);

    if (error) {
      showToast('Erro ao atualizar status.', 'error');
    } else {
      showToast(`Tipo ${!item.active ? 'ativado' : 'desativado'} com sucesso.`, 'success');
      fetchTypes();
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const styles = {
    page: { maxWidth: '900px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
    titleBlock: {},
    title: { margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#111827' },
    subtitle: { margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6b7280' },
    btnPrimary: {
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.55rem 1.1rem', backgroundColor: '#9b1c26', color: '#fff',
      border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600',
      fontSize: '14px', whiteSpace: 'nowrap',
    },
    noteBanner: {
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      backgroundColor: '#fdf2f2', border: '1px solid #f5c6c9',
      borderRadius: '8px', padding: '0.75rem 1rem',
      color: '#7f1d1d', fontSize: '0.85rem', marginBottom: '1.5rem',
    },
    card: { backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    thead: { backgroundColor: '#f9fafb' },
    th: { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' },
    td: { padding: '0.85rem 1rem', borderBottom: '1px solid #f3f4f6', color: '#374151', verticalAlign: 'middle' },
    tdLast: { borderBottom: 'none' },
    actionBtn: (color) => ({
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.35rem 0.7rem', borderRadius: '5px', border: `1px solid ${color}`,
      background: 'transparent', color, cursor: 'pointer', fontSize: '12px', fontWeight: '500',
    }),
    actionsCell: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
    emptyRow: { textAlign: 'center', color: '#6b7280', padding: '3rem 1rem' },
    loaderWrap: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' },
    // Modal form
    formGroup: { marginBottom: '1rem' },
    label: { display: 'block', fontWeight: '600', fontSize: '14px', color: '#374151', marginBottom: '4px' },
    input: {
      width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
      border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box', outline: 'none',
    },
    textarea: {
      width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
      border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box',
      outline: 'none', resize: 'vertical', minHeight: '80px',
    },
    checkRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', color: '#374151' },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' },
    btnSecondary: {
      padding: '0.55rem 1.1rem', borderRadius: '6px', border: '1px solid #d1d5db',
      background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: '500', fontSize: '14px',
    },
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Page header */}
      <div style={styles.header}>
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>Desdobramentos Globais</h1>
          <p style={styles.subtitle}>Gerenciar tipos disponíveis para todas as escolas</p>
        </div>
        <button style={styles.btnPrimary} onClick={openCreate}>
          <Plus size={16} />
          Novo Tipo
        </button>
      </div>

      {/* Info banner */}
      <div style={styles.noteBanner}>
        <Globe size={16} style={{ flexShrink: 0 }} />
        Tipos globais ficam disponíveis para todas as escolas cadastradas.
      </div>

      {/* Table card */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.loaderWrap}>
            <Loader2 size={28} style={{ color: '#9b1c26', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Descrição</th>
                <th style={{ ...styles.th, width: '100px' }}>Status</th>
                <th style={{ ...styles.th, width: '180px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {types.length === 0 ? (
                <tr>
                  <td colSpan={4} style={styles.emptyRow}>
                    Nenhum tipo de desdobramento global cadastrado.
                  </td>
                </tr>
              ) : (
                types.map((item, idx) => {
                  const isLast = idx === types.length - 1;
                  return (
                    <tr key={item.id}>
                      <td style={isLast ? { ...styles.td, ...styles.tdLast } : styles.td}>
                        <strong>{item.name}</strong>
                      </td>
                      <td style={isLast ? { ...styles.td, ...styles.tdLast } : styles.td}>
                        {item.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={isLast ? { ...styles.td, ...styles.tdLast } : styles.td}>
                        <Badge variant={item.active ? 'success' : 'default'}>
                          {item.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td style={isLast ? { ...styles.td, ...styles.tdLast } : styles.td}>
                        <div style={styles.actionsCell}>
                          <button
                            style={styles.actionBtn('#9b1c26')}
                            onClick={() => openEdit(item)}
                            title="Editar"
                          >
                            <Edit2 size={13} />
                            Editar
                          </button>
                          <button
                            style={styles.actionBtn(item.active ? '#6b7280' : '#16a34a')}
                            onClick={() => handleToggleActive(item)}
                            disabled={togglingId === item.id}
                            title={item.active ? 'Desativar' : 'Ativar'}
                          >
                            {togglingId === item.id
                              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              : null}
                            {item.active ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Keyframe for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingItem ? 'Editar Tipo de Desdobramento' : 'Novo Tipo de Desdobramento'}
      >
        <div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Nome <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              style={styles.input}
              type="text"
              placeholder="Ex: Advertência Verbal"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Descrição</label>
            <textarea
              style={styles.textarea}
              placeholder="Descreva o tipo de desdobramento (opcional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkRow}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Ativo
            </label>
          </div>

          <div style={styles.modalFooter}>
            <button style={styles.btnSecondary} onClick={closeModal} disabled={saving}>
              Cancelar
            </button>
            <button
              style={{ ...styles.btnPrimary, opacity: saving ? 0.7 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : null}
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

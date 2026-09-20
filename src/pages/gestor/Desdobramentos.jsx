import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { showToast } from '../../components/ui/Toast';
import { Loader2, Plus, Edit2, Lock, Globe, Trash2 } from 'lucide-react';

const EMPTY_FORM = { name: '', description: '', active: true };

export default function DesdobramentosConfig() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles').select('school_id').eq('id', user.id).single();

    if (profile?.school_id) {
      setSchoolId(profile.school_id);
      await fetchTypes(profile.school_id);
    }
    setLoading(false);
  };

  const fetchTypes = async (sId) => {
    const { data, error } = await supabase
      .from('followup_types')
      .select('*')
      .or(`school_id.is.null,school_id.eq.${sId}`)
      .order('is_global', { ascending: false })
      .order('name');

    if (error) {
      showToast('Erro ao carregar tipos.', 'error');
    } else {
      setTypes(data || []);
    }
  };

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

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('O nome é obrigatório.', 'error');
    setSaving(true);

    const payload = {
      school_id: schoolId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      active: form.active,
      is_global: false
    };

    let error;
    if (editingItem) {
      const { error: updateErr } = await supabase
        .from('followup_types')
        .update(payload)
        .eq('id', editingItem.id);
      error = updateErr;
    } else {
      const { error: insErr } = await supabase
        .from('followup_types')
        .insert(payload);
      error = insErr;
    }

    if (error) {
      showToast('Erro ao salvar: ' + error.message, 'error');
    } else {
      showToast(editingItem ? 'Desdobramento atualizado!' : 'Desdobramento criado!');
      closeModal();
      await fetchTypes(schoolId);
    }
    setSaving(false);
  };

  const toggleStatus = async (item) => {
    setTogglingId(item.id);
    const { error } = await supabase
      .from('followup_types')
      .update({ active: !item.active })
      .eq('id', item.id);

    if (error) {
      showToast('Erro ao alterar status.', 'error');
    } else {
      setTypes(prev => prev.map(t => t.id === item.id ? { ...t, active: !item.active } : t));
      showToast('Status atualizado.');
    }
    setTogglingId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja apagar este desdobramento? Registros que utilizaram esta opção perderão a referência visual.')) return;

    const { error } = await supabase.from('followup_types').delete().eq('id', id);
    if (error) {
      showToast('Erro ao apagar desdobramento: ' + error.message, 'error');
    } else {
      showToast('Desdobramento apagado com sucesso!');
      await fetchTypes(schoolId);
    }
  };

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 4px 0' }}>Tipos de Desdobramento</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            Gerencie os desdobramentos específicos da sua escola.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Novo Desdobramento
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Nome</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Descrição</th>
              <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '100px' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '160px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26', margin: '0 auto' }} /></td></tr>
            ) : types.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Nenhum tipo encontrado.</td></tr>
            ) : (
              types.map(t => {
                const isGlobal = t.is_global || t.school_id === null;
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t.name}
                        {isGlobal && <Badge type="default" style={{ fontSize: '10px' }}><Globe size={10} style={{ marginRight: '4px' }} /> Global</Badge>}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#4b5563' }}>{t.description || '—'}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                        backgroundColor: t.active ? '#dcfce7' : '#f3f4f6',
                        color: t.active ? '#166534' : '#6b7280'
                      }}>
                        {t.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      {isGlobal ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '12px' }}>
                          <Lock size={14} /> Padrão da Rede
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                          <button
                            onClick={() => toggleStatus(t)}
                            disabled={togglingId === t.id}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: t.active ? '#ef4444' : '#10b981' }}
                          >
                            {togglingId === t.id ? '...' : t.active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button onClick={() => openEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8' }} title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Apagar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingItem ? 'Editar Desdobramento' : 'Novo Desdobramento'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Nome *</label>
            <input
              type="text"
              style={inp}
              placeholder="Ex: Ligação para a mãe..."
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Descrição (opcional)</label>
            <textarea
              style={{ ...inp, minHeight: '80px', resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            Tipo ativo (aparece nas listas)
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button onClick={closeModal} style={{ padding: '10px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/ui/Modal';
import { showToast } from '../../components/ui/Toast';
import { Plus, Globe, Loader2, Trash2 } from 'lucide-react';

export default function AdminOcorrencias() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => { loadTypes(); }, []);

  const loadTypes = async () => {
    setLoading(true);
    // Admin vê todos os tipos: globais (school_id IS NULL) e os de escolas
    const { data, error } = await supabase
      .from('incident_types')
      .select('*, schools(name)')
      .order('school_id', { ascending: true, nullsFirst: true })
      .order('name');
    if (!error && data) setTypes(data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Nome é obrigatório', 'error');
    setSaving(true);
    const { error } = await supabase.from('incident_types').insert({
      name: form.name.trim(),
      description: form.description.trim(),
      school_id: null, // ADMIN sempre cria GLOBAL
      is_default: true,
      active: true,
    });
    if (error) {
      showToast('Erro ao salvar: ' + error.message, 'error');
    } else {
      showToast('Ocorrência global criada com sucesso!', 'success');
      setShowModal(false);
      setForm({ name: '', description: '' });
      loadTypes();
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja excluir este tipo de ocorrência?')) return;
    const { error } = await supabase.from('incident_types').delete().eq('id', id);
    if (error) showToast('Erro ao excluir: ' + error.message, 'error');
    else { showToast('Excluído com sucesso'); loadTypes(); }
  };

  const global = types.filter(t => t.school_id === null);
  const bySchool = types.filter(t => t.school_id !== null);

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const lbl = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '600' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: 0 }}>Ocorrências Globais</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>Gerencie os tipos de ocorrência padrão disponíveis para todas as escolas.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
          <Plus size={18} /> CADASTRAR OCORRÊNCIA
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
      ) : (
        <>
          {/* Globais */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={16} /> Ocorrências Globais (Sistema) — {global.length}
            </h2>
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Nome da Ocorrência', 'Descrição', 'Ações'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {global.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Nenhuma ocorrência global. Cadastre as ocorrências padrão.</td></tr>
                  ) : global.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>{t.name}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{t.description || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <Trash2 size={13} /> Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Por escola */}
          {bySchool.length > 0 && (
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px' }}>
                Ocorrências por Escola — {bySchool.length}
              </h2>
              <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      {['Nome da Ocorrência', 'Escola', 'Descrição'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bySchool.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>{t.name}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                          <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontWeight: '600', fontSize: '12px' }}>{t.schools?.name || '—'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{t.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Ocorrência Global">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontSize: '13px' }}>
            <strong>Ocorrência Global:</strong> ficará disponível para <strong>todas as escolas e professores</strong> no formulário FAZER OC.
          </div>
          <div>
            <label style={lbl}>Nome da ocorrência *</label>
            <input type="text" required style={inp} placeholder="Ex: Uso inadequado do uniforme" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>Descrição (opcional)</label>
            <textarea style={{ ...inp, minHeight: '70px', fontFamily: 'inherit' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding: '10px 16px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />} Salvar
            </button>
          </div>
        </form>
      </Modal>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

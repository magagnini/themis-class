import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { showToast } from '../../components/ui/Toast';
import { Building2, CheckCircle, XCircle, Plus, Edit2, Lock, Unlock, Loader2 } from 'lucide-react';

export default function AdminSchools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', cnpj: '', email: '', phone: '', address: '' });

  useEffect(() => { fetchSchools(); }, []);

  const fetchSchools = async () => {
    setLoading(true);
    const { data } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
    setSchools(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Nome é obrigatório.', 'error');
    setSaving(true);
    const { error } = await supabase.from('schools').insert([{ ...form, status: 'active' }]);
    if (error) { showToast('Erro ao criar escola: ' + error.message, 'error'); }
    else { showToast('Escola criada com sucesso!'); setShowModal(false); setForm({ name: '', cnpj: '', email: '', phone: '', address: '' }); fetchSchools(); }
    setSaving(false);
  };

  const toggleStatus = async (school) => {
    const newStatus = school.status === 'active' ? 'blocked' : 'active';
    const { error } = await supabase.from('schools').update({ status: newStatus }).eq('id', school.id);
    if (error) showToast('Erro ao alterar status.', 'error');
    else { showToast(`Escola ${newStatus === 'active' ? 'ativada' : 'bloqueada'}.`); fetchSchools(); }
  };

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
  const lbl = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '500' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: 0 }}>Escolas Cadastradas</h1>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
          <Plus size={18} /> Nova Escola
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Nome', 'CNPJ', 'Email', 'Status', 'Plano', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Nenhuma escola cadastrada.</td></tr>
              ) : schools.map(school => (
                <tr key={school.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>{school.name}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{school.cnpj || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{school.email || '—'}</td>
                  <td style={{ padding: '14px 16px' }}><Badge type={school.status}>{school.status === 'active' ? 'Ativa' : school.status === 'blocked' ? 'Bloqueada' : 'Suspensa'}</Badge></td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{school.plan || 'basic'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => toggleStatus(school)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: `1px solid ${school.status === 'active' ? '#fca5a5' : '#6ee7b7'}`, borderRadius: '6px', background: 'none', cursor: 'pointer', fontSize: '13px', color: school.status === 'active' ? '#ef4444' : '#059669', fontWeight: '500' }}>
                        {school.status === 'active' ? <><Lock size={14} /> Bloquear</> : <><Unlock size={14} /> Ativar</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Cadastrar Nova Escola">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[['name', 'Nome da Escola *', 'text'], ['cnpj', 'CNPJ', 'text'], ['email', 'E-mail', 'email'], ['phone', 'Telefone', 'text'], ['address', 'Endereço', 'text']].map(([field, label, type]) => (
            <div key={field}>
              <label style={lbl}>{label}</label>
              <input type={type} style={inp} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
              {saving ? 'Salvando...' : 'Criar Escola'}
            </button>
          </div>
        </div>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

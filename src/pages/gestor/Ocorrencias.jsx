import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Loader2, Plus, Edit2, Lock } from 'lucide-react';
import { showToast } from '../../components/ui/Toast';

export default function TiposOcorrencia() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myRole, setMyRole] = useState(null);
  const [mySchoolId, setMySchoolId] = useState(null);
  
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data: profile } = await supabase.from('profiles').select('role, school_id').eq('id', userData.user.id).single();
      setMyRole(profile?.role);
      setMySchoolId(profile?.school_id);
    }
    
    // Buscar tipos de ocorrência
    const { data, error } = await supabase
      .from('incident_types')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');
      
    if (!error && data) setTypes(data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Nome é obrigatório', 'error');

    setSaving(true);
    
    // Se admin, school_id é null (Global). Se gestor, school_id = mySchoolId (Escola)
    const newSchoolId = myRole === 'admin' ? null : mySchoolId;
    
    const { error } = await supabase.from('incident_types').insert({
      name: form.name.trim(),
      description: form.description.trim(),
      school_id: newSchoolId,
      is_default: myRole === 'admin' // Admin cria como padrão global
    });

    if (error) {
      showToast('Erro ao salvar tipo de ocorrência: ' + error.message, 'error');
    } else {
      showToast('Tipo de ocorrência salvo com sucesso!', 'success');
      setShowModal(false);
      setForm({ name: '', description: '' });
      loadData();
    }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: 0 }}>Tipos de Ocorrência</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>Gerencie as ocorrências disponíveis no formulário FAZER OC.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
          <Plus size={18} /> CADASTRAR OCORRÊNCIA
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Nome da Ocorrência', 'Descrição', 'Visibilidade / Origem'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Nenhum tipo cadastrado.</td></tr>
              ) : types.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {t.name}
                      {t.school_id === null && <Lock size={14} color="#9ca3af" title="Ocorrência Global do Sistema" />}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{t.description || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                    {t.school_id === null ? (
                      <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: '12px', fontWeight: '600' }}>Global (Sistema)</span>
                    ) : (
                      <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', padding: '4px 8px', borderRadius: '12px', fontWeight: '600' }}>Minha Escola</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Cadastrar Nova Ocorrência">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '600' }}>Nome da ocorrência *</label>
            <input
              type="text"
              required
              placeholder="Ex: Uso de boné dentro da sala"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '600' }}>Descrição (opcional)</label>
            <textarea
              placeholder="Breve descrição da ocorrência..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', minHeight: '80px', fontFamily: 'inherit' }}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          {myRole === 'gestor' && (
            <div style={{ padding: '12px', backgroundColor: '#fffbeb', color: '#b45309', borderRadius: '6px', fontSize: '13px' }}>
              <strong>Nota:</strong> Como gestor, esta ocorrência será visível apenas para os professores da sua escola.
            </div>
          )}
          {myRole === 'admin' && (
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontSize: '13px' }}>
              <strong>Nota:</strong> Como administrador, você criará uma Ocorrência Global que ficará disponível para todas as escolas cadastradas.
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 16px', background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#374151' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '10px 16px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              Salvar Ocorrência
            </button>
          </div>
        </form>
      </Modal>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

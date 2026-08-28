import { useState, useEffect } from 'react';
import { supabase, supabaseAdminAuth } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { showToast } from '../../components/ui/Toast';
import { Plus, Loader2, Lock, Unlock, Mail, ShieldAlert } from 'lucide-react';

export default function Professores() {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

  useEffect(() => { fetchProfessors(); }, []);

  const fetchProfessors = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: currentProfile } = await supabase.from('profiles').select('school_id').eq('id', userData.user.id).single();
    if (!currentProfile?.school_id) return;

    const { data } = await supabase.from('profiles').select('*').eq('role', 'professor').eq('school_id', currentProfile.school_id).order('name');
    setProfessors(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      return showToast('Nome, E-mail e Senha são obrigatórios.', 'error');
    }
    setSaving(true);
    
    // Obter escola do gestor atual
    const { data: userData } = await supabase.auth.getUser();
    const { data: currentProfile } = await supabase.from('profiles').select('school_id').eq('id', userData.user.id).single();

    if (!currentProfile?.school_id) {
      showToast('Erro: Não foi possível identificar sua escola.', 'error');
      setSaving(false);
      return;
    }

    // Criar auth user usando cliente secundário
    const { data: authData, error: authError } = await supabaseAdminAuth.auth.signUp({
      email: form.email,
      password: form.password
    });

    if (authError) {
      showToast('Erro ao criar acesso: ' + authError.message, 'error');
    } else if (authData?.user) {
      // Atualizar profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        role: 'professor',
        name: form.name,
        email: form.email,
        phone: form.phone,
        school_id: currentProfile.school_id,
        active: true,
        temp_password: true
      });
      if (profileError) showToast('Erro ao atualizar perfil do professor.', 'error');
      else showToast('Professor cadastrado com sucesso!');
    }

    setShowModal(false);
    setForm({ name: '', email: '', password: '', phone: '' });
    fetchProfessors();
    setSaving(false);
  };

  const toggleStatus = async (prof) => {
    const { error } = await supabase.from('profiles').update({ active: !prof.active }).eq('id', prof.id);
    if (error) showToast('Erro ao alterar status.', 'error');
    else { showToast(`Professor ${!prof.active ? 'ativado' : 'desativado'}.`); fetchProfessors(); }
  };

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
  const lbl = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '500' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827', margin: 0 }}>Professores</h1>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
          <Plus size={18} /> Novo Professor
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Nome', 'Email', 'Telefone', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {professors.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Nenhum professor cadastrado.</td></tr>
              ) : professors.map(prof => (
                <tr key={prof.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>{prof.name}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{prof.email}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{prof.phone || '—'}</td>
                  <td style={{ padding: '14px 16px' }}><Badge type={prof.active ? 'active' : 'inactive'}>{prof.active ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => toggleStatus(prof)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: `1px solid ${prof.active ? '#fca5a5' : '#6ee7b7'}`, borderRadius: '6px', background: 'none', cursor: 'pointer', fontSize: '13px', color: prof.active ? '#ef4444' : '#059669', fontWeight: '500' }}>
                      {prof.active ? <><Lock size={14} /> Desativar</> : <><Unlock size={14} /> Ativar</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Cadastrar Professor">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '6px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Mail color="#166534" size={20} style={{ marginTop: '2px' }}/>
            <div style={{ fontSize: '13px', color: '#166534' }}>
              <strong>Acesso ao Sistema:</strong> O professor usará este e-mail e senha para fazer login no Themis Class. Repasse estas informações para ele de forma segura.
            </div>
          </div>

          {[['name', 'Nome Completo *', 'text'], ['email', 'E-mail de Acesso *', 'email'], ['password', 'Senha Inicial *', 'text'], ['phone', 'Telefone', 'text']].map(([field, label, type]) => (
            <div key={field}>
              <label style={lbl}>{label}</label>
              <input type={type} style={inp} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {saving ? <Loader2 size={16} className="animar-giro" /> : null}
              {saving ? 'Criando...' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animar-giro { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}

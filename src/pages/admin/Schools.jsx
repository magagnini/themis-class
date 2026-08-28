import { useState, useEffect } from 'react';
import { supabase, supabaseAdminAuth } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { showToast } from '../../components/ui/Toast';
import { School, Lock, Unlock, Loader2, Plus, UserPlus } from 'lucide-react';

export default function AdminSchools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ 
    name: '', cnpj: '', email: '', phone: '', address: '',
    gestorName: '', gestorEmail: '', gestorPassword: '' 
  });

  useEffect(() => { fetchSchools(); }, []);

  const fetchSchools = async () => {
    setLoading(true);
    const { data } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
    setSchools(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.gestorEmail.trim() || !form.gestorPassword.trim()) {
      return showToast('Nome da escola, email e senha do gestor são obrigatórios.', 'error');
    }
    setSaving(true);
    
    // 1. Criar a Escola
    const { data: newSchool, error: schoolError } = await supabase.from('schools').insert([{
      name: form.name, cnpj: form.cnpj, email: form.email, phone: form.phone, address: form.address, status: 'active'
    }]).select().single();

    if (schoolError) {
      showToast('Erro ao criar escola: ' + schoolError.message, 'error');
      setSaving(false);
      return;
    }

    // 2. Criar o Gestor usando o cliente secundário (para não deslogar o admin)
    const { data: authData, error: authError } = await supabaseAdminAuth.auth.signUp({
      email: form.gestorEmail,
      password: form.gestorPassword
    });

    if (authError) {
      showToast('Escola criada, mas erro ao criar Gestor: ' + authError.message, 'error');
    } else if (authData?.user) {
      // 3. Atualizar o profile do Gestor
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        role: 'gestor',
        name: form.gestorName || 'Gestor',
        email: form.gestorEmail,
        school_id: newSchool.id,
        active: true,
        temp_password: true
      });
      if (profileError) showToast('Erro ao atualizar perfil do gestor.', 'error');
      else showToast('Escola e Gestor criados com sucesso!');
    }

    setShowModal(false);
    setForm({ name: '', cnpj: '', email: '', phone: '', address: '', gestorName: '', gestorEmail: '', gestorPassword: '' });
    fetchSchools();
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
                {['Nome', 'CNPJ', 'Email', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Nenhuma escola cadastrada.</td></tr>
              ) : schools.map(school => (
                <tr key={school.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>{school.name}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{school.cnpj || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{school.email || '—'}</td>
                  <td style={{ padding: '14px 16px' }}><Badge type={school.status}>{school.status === 'active' ? 'Ativa' : school.status === 'blocked' ? 'Bloqueada' : 'Suspensa'}</Badge></td>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Cadastrar Escola e Gestor" size="lg">
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Coluna Escola */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#9b1c26', display: 'flex', alignItems: 'center', gap: '6px' }}><School size={16}/> Dados da Escola</h3>
            {[['name', 'Nome da Escola *', 'text'], ['cnpj', 'CNPJ', 'text'], ['email', 'E-mail', 'email'], ['phone', 'Telefone', 'text'], ['address', 'Endereço', 'text']].map(([field, label, type]) => (
              <div key={field}>
                <label style={lbl}>{label}</label>
                <input type={type} style={inp} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
              </div>
            ))}
          </div>

          <div style={{ width: '1px', backgroundColor: '#e5e7eb' }}></div>

          {/* Coluna Gestor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#9b1c26', display: 'flex', alignItems: 'center', gap: '6px' }}><UserPlus size={16}/> Primeiro Gestor</h3>
            <p style={{ margin: '-10px 0 10px 0', fontSize: '12px', color: '#6b7280' }}>Crie o acesso para o diretor/gestor desta escola.</p>
            {[['gestorName', 'Nome do Gestor', 'text'], ['gestorEmail', 'E-mail de Acesso *', 'email'], ['gestorPassword', 'Senha Inicial *', 'text']].map(([field, label, type]) => (
              <div key={field}>
                <label style={lbl}>{label}</label>
                <input type={type} style={inp} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
              </div>
            ))}
            <div style={{ marginTop: 'auto', backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
              <strong>Atenção:</strong> O Gestor usará este e-mail e senha para fazer login no Themis Class. Se a opção "Confirmar e-mail" estiver ativada no Supabase, ele precisará confirmar o e-mail antes de acessar.
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
          <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saving ? <Loader2 size={16} className="animar-giro" /> : null}
            {saving ? 'Criando...' : 'Finalizar Cadastro'}
          </button>
        </div>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animar-giro { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}

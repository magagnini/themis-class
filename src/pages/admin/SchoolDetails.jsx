import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, supabaseAdminAuth } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { showToast } from '../../components/ui/Toast';
import {
  ArrowLeft, Settings, Users, GraduationCap, Trash2, Lock, Unlock,
  KeyRound, Pencil, Loader2, Save, AlertTriangle, School
} from 'lucide-react';

export default function AdminSchoolDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [school, setSchool] = useState(null);
  const [gestores, setGestores] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit school modal
  const [showEditSchool, setShowEditSchool] = useState(false);
  const [schoolForm, setSchoolForm] = useState({});
  const [savingSchool, setSavingSchool] = useState(false);

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null); // { id, name }
  const [newPassword, setNewPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  // Edit profile modal
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Confirm delete
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: schoolData } = await supabase.from('schools').select('*').eq('id', id).single();
    setSchool(schoolData);
    setSchoolForm(schoolData || {});

    const { data: profiles } = await supabase.from('profiles').select('*').eq('school_id', id).order('name');
    setGestores((profiles || []).filter(p => p.role === 'gestor'));
    setProfessors((profiles || []).filter(p => p.role === 'professor'));
    setLoading(false);
  };

  // ───── Save school settings ─────
  const handleSaveSchool = async () => {
    setSavingSchool(true);
    const { error } = await supabase.from('schools').update({
      name: schoolForm.name,
      cnpj: schoolForm.cnpj,
      email: schoolForm.email,
      phone: schoolForm.phone,
      address: schoolForm.address,
      max_professors: Number(schoolForm.max_professors) || 30,
    }).eq('id', id);
    if (error) showToast('Erro ao salvar: ' + error.message, 'error');
    else { showToast('Escola atualizada!'); setShowEditSchool(false); fetchAll(); }
    setSavingSchool(false);
  };

  // ───── Change password via RPC ─────
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) return showToast('Senha deve ter pelo menos 6 caracteres.', 'error');
    setSavingPass(true);
    const { error } = await supabase.rpc('admin_update_user_password', {
      target_user_id: passwordTarget.id,
      new_password: newPassword
    });
    if (error) showToast('Erro ao alterar senha: ' + error.message, 'error');
    else { showToast(`Senha de ${passwordTarget.name} alterada!`); setShowPasswordModal(false); setNewPassword(''); }
    setSavingPass(false);
  };

  // ───── Edit profile (name, email, phone) ─────
  const handleSaveProfile = async () => {
    setSavingEdit(true);
    const { error: profileErr } = await supabase.from('profiles').update({
      name: editForm.name,
      phone: editForm.phone,
    }).eq('id', editTarget.id);

    // Se o email mudou, atualizar via RPC
    if (editForm.email !== editTarget.email) {
      const { error: emailErr } = await supabase.rpc('admin_update_user_email', {
        target_user_id: editTarget.id,
        new_email: editForm.email
      });
      if (emailErr) { showToast('Erro ao atualizar e-mail: ' + emailErr.message, 'error'); setSavingEdit(false); return; }
    }

    if (profileErr) showToast('Erro ao atualizar perfil: ' + profileErr.message, 'error');
    else { showToast('Perfil atualizado!'); setShowEditProfile(false); fetchAll(); }
    setSavingEdit(false);
  };

  // ───── Toggle suspend ─────
  const handleToggleSuspend = async (profile) => {
    const { error } = await supabase.from('profiles').update({ active: !profile.active }).eq('id', profile.id);
    if (error) showToast('Erro: ' + error.message, 'error');
    else { showToast(profile.active ? 'Usuário suspenso.' : 'Usuário reativado.'); fetchAll(); }
  };

  // ───── Delete user ─────
  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: deleteTarget.id });
    if (error) showToast('Erro ao excluir: ' + error.message, 'error');
    else { showToast(`${deleteTarget.name} excluído.`); setShowConfirmDelete(false); fetchAll(); }
    setDeleting(false);
  };

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
  const lbl = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '500' };

  const ProfileTable = ({ data, title, icon }) => (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon} {title} <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '400' }}>({data.length})</span>
      </h3>
      {data.length === 0 ? (
        <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
          Nenhum {title.toLowerCase()} cadastrado.
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Nome', 'E-mail', 'Telefone', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(profile => (
                <tr key={profile.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                    {profile.name}
                    {!profile.active && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#ef4444', backgroundColor: '#fef2f2', padding: '1px 6px', borderRadius: '10px' }}>Suspenso</span>}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '13px' }}>{profile.email || '—'}</td>
                  <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '13px' }}>{profile.phone || '—'}</td>
                  <td style={{ padding: '12px 14px' }}><Badge type={profile.active ? 'active' : 'inactive'}>{profile.active ? 'Ativo' : 'Suspenso'}</Badge></td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => { setEditTarget(profile); setEditForm({ name: profile.name || '', email: profile.email || '', phone: profile.phone || '' }); setShowEditProfile(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 10px', border: '1px solid #93c5fd', borderRadius: '5px', background: 'none', cursor: 'pointer', fontSize: '12px', color: '#1d4ed8', fontWeight: '500' }}>
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => { setPasswordTarget(profile); setShowPasswordModal(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 10px', border: '1px solid #a5b4fc', borderRadius: '5px', background: 'none', cursor: 'pointer', fontSize: '12px', color: '#4f46e5', fontWeight: '500' }}>
                        <KeyRound size={12} /> Senha
                      </button>
                      <button onClick={() => handleToggleSuspend(profile)}
                        style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 10px', border: `1px solid ${profile.active ? '#fca5a5' : '#6ee7b7'}`, borderRadius: '5px', background: 'none', cursor: 'pointer', fontSize: '12px', color: profile.active ? '#ef4444' : '#059669', fontWeight: '500' }}>
                        {profile.active ? <><Lock size={12} /> Suspender</> : <><Unlock size={12} /> Reativar</>}
                      </button>
                      <button onClick={() => { setDeleteTarget(profile); setShowConfirmDelete(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 10px', border: '1px solid #fca5a5', borderRadius: '5px', background: 'none', cursor: 'pointer', fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#9b1c26' }} />
    </div>
  );

  if (!school) return <div style={{ padding: '2rem', color: '#6b7280' }}>Escola não encontrada.</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <button onClick={() => navigate('/admin/escolas')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', marginBottom: '10px', padding: 0 }}>
            <ArrowLeft size={16} /> Voltar às Escolas
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>{school.name}</h1>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: '#6b7280' }}>
            {school.email && <span>📧 {school.email}</span>}
            {school.cnpj && <span>📋 {school.cnpj}</span>}
            {school.phone && <span>📞 {school.phone}</span>}
            <Badge type={school.status}>{school.status === 'active' ? 'Ativa' : 'Bloqueada'}</Badge>
          </div>
        </div>
        <button onClick={() => setShowEditSchool(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
          <Settings size={18} /> Editar Escola
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '2rem' }}>
        {[
          { label: 'Gestores', value: gestores.length, color: '#6366f1' },
          { label: 'Professores', value: `${professors.length} / ${school.max_professors || 30}`, color: professors.length >= (school.max_professors || 30) ? '#ef4444' : '#9b1c26' },
          { label: 'Limite Professores', value: school.max_professors || 30, color: '#059669' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${card.color}` }}>
            <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{card.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Gestores */}
      <ProfileTable data={gestores} title="Gestores" icon={<GraduationCap size={18} color="#6366f1" />} />

      {/* Professores */}
      <ProfileTable data={professors} title="Professores" icon={<Users size={18} color="#9b1c26" />} />

      {/* ───── Modal: Edit School ───── */}
      <Modal isOpen={showEditSchool} onClose={() => setShowEditSchool(false)} title="Editar Escola">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[['name', 'Nome da Escola', 'text'], ['cnpj', 'CNPJ', 'text'], ['email', 'E-mail', 'email'], ['phone', 'Telefone', 'text'], ['address', 'Endereço', 'text']].map(([field, label, type]) => (
            <div key={field}>
              <label style={lbl}>{label}</label>
              <input type={type} style={inp} value={schoolForm[field] || ''} onChange={e => setSchoolForm(p => ({ ...p, [field]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label style={lbl}>Limite de Professores</label>
            <select style={inp} value={schoolForm.max_professors || 30} onChange={e => setSchoolForm(p => ({ ...p, max_professors: e.target.value }))}>
              {[30, 35, 40, 45, 50, 55, 60].map(n => <option key={n} value={n}>{n} professores</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => setShowEditSchool(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSaveSchool} disabled={savingSchool} style={{ padding: '10px 20px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {savingSchool ? <Loader2 size={16} className="animar-giro" /> : <Save size={16} />} Salvar
            </button>
          </div>
        </div>
      </Modal>

      {/* ───── Modal: Change Password ───── */}
      <Modal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setNewPassword(''); }} title={`Alterar Senha — ${passwordTarget?.name}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px', fontSize: '13px', color: '#92400e' }}>
            <strong>Atenção:</strong> A nova senha substituirá a senha atual do usuário permanentemente.
          </div>
          <div>
            <label style={lbl}>Nova Senha (mínimo 6 caracteres)</label>
            <input type="text" style={inp} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Digite a nova senha..." />
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); }} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleChangePassword} disabled={savingPass} style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {savingPass ? <Loader2 size={16} className="animar-giro" /> : <KeyRound size={16} />} Alterar Senha
            </button>
          </div>
        </div>
      </Modal>

      {/* ───── Modal: Edit Profile ───── */}
      <Modal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} title={`Editar — ${editTarget?.name}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[['name', 'Nome'], ['email', 'E-mail de Login'], ['phone', 'Telefone']].map(([field, label]) => (
            <div key={field}>
              <label style={lbl}>{label}</label>
              <input type={field === 'email' ? 'email' : 'text'} style={inp} value={editForm[field]} onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowEditProfile(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSaveProfile} disabled={savingEdit} style={{ padding: '10px 20px', backgroundColor: '#1d4ed8', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {savingEdit ? <Loader2 size={16} className="animar-giro" /> : <Save size={16} />} Salvar
            </button>
          </div>
        </div>
      </Modal>

      {/* ───── Modal: Confirm Delete ───── */}
      <Modal isOpen={showConfirmDelete} onClose={() => setShowConfirmDelete(false)} title="Confirmar Exclusão">
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <AlertTriangle color="#ef4444" size={24} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 6px 0', fontWeight: '700', color: '#7f1d1d' }}>Esta ação é irreversível!</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#991b1b' }}>
                Você está prestes a excluir permanentemente o usuário <strong>{deleteTarget?.name}</strong>. Isso removerá o acesso ao sistema e apagará o registro de autenticação.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowConfirmDelete(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
            <button onClick={handleDelete} disabled={deleting} style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {deleting ? <Loader2 size={16} className="animar-giro" /> : <Trash2 size={16} />} Excluir Permanentemente
            </button>
          </div>
        </div>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animar-giro { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}

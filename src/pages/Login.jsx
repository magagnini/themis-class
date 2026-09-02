import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { setCachedProfile, getCachedProfile, clearCachedProfile } from '../lib/userCache';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Se já estiver logado, redirecionar sem query ao banco usando o cache
  useEffect(() => {
    const cached = getCachedProfile();
    if (cached?.role) {
      navigateByRole(cached.role);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectByRole(session);
    });
  }, []);

  const navigateByRole = (role) => {
    if (role === 'admin') navigate('/admin', { replace: true });
    else if (role === 'gestor') navigate('/gestor', { replace: true });
    else if (role === 'professor') navigate('/professor', { replace: true });
  };

  const redirectByRole = async (session) => {
    if (!session) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, role, school_id, active')
      .eq('id', session.user.id)
      .maybeSingle();
    if (data) { setCachedProfile(data); navigateByRole(data.role); }
    else navigateByRole(session.user.user_metadata?.role);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    clearCachedProfile();

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (authError) {
        // Se for erro de credencial, mostra a mensagem amigável, senão mostra o erro real
        const isCredentialError = authError.message.toLowerCase().includes('invalid login credentials');
        setError(isCredentialError ? 'E-mail ou senha incorretos. Tente novamente.' : `Erro: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError('Não foi possível autenticar. Tente novamente.');
        setLoading(false);
        return;
      }

      // Busca perfil completo uma única vez e salva no cache
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, email, role, school_id, active')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileData?.active === false) {
        await supabase.auth.signOut();
        clearCachedProfile();
        setError('Sua conta está suspensa. Contate o administrador.');
        setLoading(false);
        return;
      }

      if (profileData) {
        setCachedProfile(profileData); // cache preenchido — ProtectedRoute não precisará consultar o banco
        navigateByRole(profileData.role);
      } else {
        const role = data.user.user_metadata?.role;
        if (role) navigateByRole(role);
        else { setError('Perfil sem permissão atribuída. Contate o administrador.'); setLoading(false); }
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <h1 style={{ color: '#9b1c26', fontSize: '32px', letterSpacing: '-0.5px', marginBottom: '8px', fontWeight: 'bold', margin: 0 }} translate="no">Themis Class</h1>
          <p style={{ color: '#6b7280', fontSize: '15px', margin: '8px 0 0 0' }}>Gestão de Ocorrências Escolares</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div style={{ padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>E-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#9ca3af' }} />
              <input
                type="email"
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@escola.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#9ca3af' }} />
              <input
                type="password"
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            style={{ width: '100%', padding: '14px', fontSize: '16px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600' }}
            disabled={loading}
          >
            {loading
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Entrando...</>
              : <><LogIn size={18} /> Entrar no Sistema</>
            }
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

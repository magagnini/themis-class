import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Se o usuário já estiver logado, buscar o perfil e redirecionar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data?.role === 'admin') navigate('/admin');
            else if (data?.role === 'gestor') navigate('/gestor');
            else if (data?.role === 'professor') navigate('/professor');
          });
      }
    });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Buscar o perfil do usuário
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          setError('Erro ao buscar perfil: ' + profileError.message);
        } else if (profileData) {
          const role = profileData.role;
          if (role === 'admin') navigate('/admin');
          else if (role === 'gestor') navigate('/gestor');
          else if (role === 'professor') navigate('/professor');
          else setError('Perfil sem permissão atribuída.');
        } else {
          setError('Perfil não encontrado no banco de dados.');
        }
      }
    } catch (err) {
      setError('Erro de rede: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <h1 style={{ color: '#9b1c26', fontSize: '32px', letterSpacing: '-0.5px', marginBottom: '8px', fontWeight: 'bold', margin: 0 }}>Themis Class</h1>
          <p style={{ color: '#6b7280', fontSize: '15px', margin: 0 }}>Gestão de Ocorrências Escolares</p>
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
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@escola.com"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#9ca3af' }} />
              <input
                type="password"
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            style={{ width: '100%', padding: '14px', fontSize: '16px', backgroundColor: '#9b1c26', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', transition: 'background-color 0.2s' }}
            disabled={loading}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <LogIn size={18} />}
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '25px' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px' }}
            >
              Esqueci minha senha
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        input:focus {
          border-color: #9b1c26 !important;
          box-shadow: 0 0 0 2px rgba(155, 28, 38, 0.2);
        }
      `}</style>
    </div>
  );
}

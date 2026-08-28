import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl === 'https://sua-url-do-supabase.supabase.co') {
  console.error('ERRO: VITE_SUPABASE_URL não está configurada! Verifique o arquivo .env e reinicie o Vite.')
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')

// Cliente secundário para criar usuários (signup) sem deslogar o usuário atual
export const supabaseAdminAuth = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    storage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})

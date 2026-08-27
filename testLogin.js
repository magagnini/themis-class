import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testLogin() {
  console.log('Testando login via Node...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'vlmat.usp@gmail.com',
    password: 'ThemisVL_Mat971590255'
  })

  if (error) {
    console.error('Erro no login:', error.message)
  } else {
    console.log('Login com sucesso! ID do usuário:', data.user.id)
    
    // Testar se perfil existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
      
    if (profileError) {
      console.error('Erro ao buscar perfil:', profileError.message)
    } else {
      console.log('Perfil encontrado:', profile)
    }
  }
}

testLogin()

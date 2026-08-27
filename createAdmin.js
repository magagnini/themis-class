import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function createAdmin() {
  console.log('Tentando registrar administrador...')
  
  // Tentar realizar o cadastro do usuário (SignUp)
  const { data, error } = await supabase.auth.signUp({
    email: 'vlmat.usp@gmail.com',
    password: 'ThemisVL_Mat971590255'
  })

  if (error) {
    console.error('Erro ao criar usuário:', error.message)
    return
  }

  const userId = data.user.id
  console.log('Usuário criado com ID:', userId)

  // Inserir na tabela profiles como "admin"
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([
      { id: userId, role: 'admin', name: 'Administrador Principal' }
    ])

  if (profileError) {
    console.error('Erro ao criar perfil de admin:', profileError.message)
  } else {
    console.log('Perfil de administrador criado com sucesso!')
  }
}

createAdmin()

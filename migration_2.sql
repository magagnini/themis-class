-- Extensão necessária para criptografia de senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função para deletar usuário do auth (apenas admin pode chamar)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Função para atualizar senha (apenas admin pode chamar)
CREATE OR REPLACE FUNCTION public.admin_update_user_password(target_user_id UUID, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;

-- Função para atualizar e-mail de login (apenas admin pode chamar)
CREATE OR REPLACE FUNCTION public.admin_update_user_email(target_user_id UUID, new_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  UPDATE auth.users
  SET email = new_email,
      email_confirmed_at = NOW()
  WHERE id = target_user_id;
  UPDATE public.profiles
  SET email = new_email
  WHERE id = target_user_id;
END;
$$;

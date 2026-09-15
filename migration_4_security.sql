-- =================================================================================
-- MIGRATION 4: RLS STRICT SECURITY
-- Este script resolve a falha de segurança apontada pelo ChatGPT, habilitando
-- RLS na tabela `profiles` e evitando recursão infinita usando funções SECURITY DEFINER.
-- =================================================================================

-- 1. Criar funções auxiliares SECURITY DEFINER para ler os dados do usuário
--    sem engatilhar as regras de RLS (evita o erro de infinite recursion).
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Habilitar RLS em PROFILES e definir as políticas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles 
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can do everything on profiles" ON public.profiles;
CREATE POLICY "Admins can do everything on profiles" ON public.profiles 
  USING (get_auth_role() = 'admin');

DROP POLICY IF EXISTS "Gestores can read school profiles" ON public.profiles;
CREATE POLICY "Gestores can read school profiles" ON public.profiles 
  FOR SELECT USING (
    school_id = get_auth_school_id() 
    AND get_auth_role() IN ('gestor', 'coordenador')
  );

DROP POLICY IF EXISTS "Gestores can insert school profiles" ON public.profiles;
CREATE POLICY "Gestores can insert school profiles" ON public.profiles 
  FOR INSERT WITH CHECK (
    school_id = get_auth_school_id() 
    AND get_auth_role() = 'gestor'
    AND role IN ('professor', 'gestor', 'coordenador')
  );

DROP POLICY IF EXISTS "Gestores can update school profiles" ON public.profiles;
CREATE POLICY "Gestores can update school profiles" ON public.profiles 
  FOR UPDATE USING (
    school_id = get_auth_school_id() 
    AND get_auth_role() = 'gestor'
  );

-- 3. Atualizar as políticas das outras tabelas para usar as funções seguras
-- SCHOOLS
DROP POLICY IF EXISTS "Admin can do everything on schools" ON public.schools;
CREATE POLICY "Admin can do everything on schools" ON public.schools
  USING (get_auth_role() = 'admin');

DROP POLICY IF EXISTS "Gestor can read own school" ON public.schools;
CREATE POLICY "Gestor can read own school" ON public.schools
  FOR SELECT USING (id = get_auth_school_id());

-- STUDENTS
DROP POLICY IF EXISTS "Users access own school students" ON public.students;
CREATE POLICY "Users access own school students" ON public.students
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- GUARDIANS
DROP POLICY IF EXISTS "Users access own school guardians" ON public.guardians;
CREATE POLICY "Users access own school guardians" ON public.guardians
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- CLASSES
DROP POLICY IF EXISTS "Users access own school classes" ON public.classes;
CREATE POLICY "Users access own school classes" ON public.classes
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- CLASS_STUDENTS
DROP POLICY IF EXISTS "Users access own school class_students" ON public.class_students;
CREATE POLICY "Users access own school class_students" ON public.class_students
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- CLASS_TEACHERS
DROP POLICY IF EXISTS "Users access own school class_teachers" ON public.class_teachers;
CREATE POLICY "Users access own school class_teachers" ON public.class_teachers
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- INCIDENT_TYPES
DROP POLICY IF EXISTS "Users access incident types" ON public.incident_types;
CREATE POLICY "Users access incident types" ON public.incident_types
  USING (school_id IS NULL OR school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- INCIDENTS
DROP POLICY IF EXISTS "Users access own school incidents" ON public.incidents;
CREATE POLICY "Users access own school incidents" ON public.incidents
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- INCIDENT_STATUS_LOG
DROP POLICY IF EXISTS "Users access incident status log" ON public.incident_status_log;
CREATE POLICY "Users access incident status log" ON public.incident_status_log
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (i.school_id = get_auth_school_id() OR get_auth_role() = 'admin')
    )
  );

-- COMMUNICATIONS
DROP POLICY IF EXISTS "Users access own school communications" ON public.communications;
CREATE POLICY "Users access own school communications" ON public.communications
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Users access own school audit logs" ON public.audit_logs;
CREATE POLICY "Users access own school audit logs" ON public.audit_logs
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- =================================================================================
-- FIM DA MIGRAÇÃO
-- =================================================================================

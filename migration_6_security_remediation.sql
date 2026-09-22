-- =================================================================================
-- THEMIS CLASS — AUDIT & SECURITY REMEDIATION MIGRATION (MIGRATION 6)
-- Este script corrige todas as vulnerabilidades identificadas na auditoria de segurança.
-- Ele não apaga dados, não recria tabelas e não altera roles de usuários existentes.
-- Execute no SQL Editor do Supabase.
-- =================================================================================

-- 1. CORREÇÃO CRÍTICA DAS RPCs (Vulnerabilidade de Bypass Tri-State / NULL por Anon)
-- Revogar execução pública e proteger contra NULL na checagem de role
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Rejeitar se o usuário não estiver autenticado ou não for admin
  IF auth.uid() IS NULL OR COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem executar esta operacao';
  END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_password(UUID, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user_password(target_user_id UUID, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL OR COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem executar esta operacao';
  END IF;
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_email(UUID, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_email(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user_email(target_user_id UUID, new_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL OR COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem executar esta operacao';
  END IF;
  UPDATE auth.users
  SET email = new_email,
      email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = target_user_id;
  UPDATE public.profiles
  SET email = new_email
  WHERE id = target_user_id;
END;
$$;

-- 2. CORREÇÃO EM PROFILES (Impedir que Gestor ou qualquer usuário comum altere role para 'admin')
DROP POLICY IF EXISTS "Gestores can update school profiles" ON public.profiles;
CREATE POLICY "Gestores can update school profiles" ON public.profiles 
  FOR UPDATE 
  TO authenticated
  USING (
    school_id = get_auth_school_id() 
    AND get_auth_role() = 'gestor'
  )
  WITH CHECK (
    school_id = get_auth_school_id() 
    AND get_auth_role() = 'gestor'
    AND role IN ('professor', 'gestor', 'coordenador') -- IMPEDE TRANSFORMAR QUALQUER UM EM ADMIN
  );

-- Garantir que anon não tenha SELECT nem INSERT em profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can do everything on profiles" ON public.profiles;
CREATE POLICY "Admins can do everything on profiles" ON public.profiles 
  TO authenticated
  USING (get_auth_role() = 'admin')
  WITH CHECK (get_auth_role() = 'admin');

DROP POLICY IF EXISTS "Gestores can read school profiles" ON public.profiles;
CREATE POLICY "Gestores can read school profiles" ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (
    school_id = get_auth_school_id() 
    AND get_auth_role() IN ('gestor', 'coordenador')
  );

DROP POLICY IF EXISTS "Gestores can insert school profiles" ON public.profiles;
CREATE POLICY "Gestores can insert school profiles" ON public.profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    school_id = get_auth_school_id() 
    AND get_auth_role() = 'gestor'
    AND role IN ('professor', 'gestor', 'coordenador')
  );

-- 3. CORREÇÃO EM INCIDENT_TYPES (Remover acesso anônimo e granularizar permissões)
ALTER TABLE public.incident_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access incident types" ON public.incident_types;
DROP POLICY IF EXISTS "incident_types_select" ON public.incident_types;
DROP POLICY IF EXISTS "incident_types_admin" ON public.incident_types;
DROP POLICY IF EXISTS "incident_types_gestor_insert" ON public.incident_types;
DROP POLICY IF EXISTS "incident_types_gestor_update" ON public.incident_types;
DROP POLICY IF EXISTS "incident_types_gestor_delete" ON public.incident_types;

-- Leitura: apenas usuários autenticados (professores, gestores, admins)
CREATE POLICY "incident_types_select" ON public.incident_types
  FOR SELECT
  TO authenticated
  USING (
    active = TRUE AND (
      school_id IS NULL -- tipos globais
      OR school_id = get_auth_school_id() -- tipos da própria escola
      OR get_auth_role() = 'admin' -- admin vê tudo
    )
  );

-- Admin: gerencia todos os tipos
CREATE POLICY "incident_types_admin" ON public.incident_types
  FOR ALL
  TO authenticated
  USING (get_auth_role() = 'admin')
  WITH CHECK (get_auth_role() = 'admin');

-- Gestor: gerencia APENAS os tipos da própria escola (nunca os globais com school_id IS NULL)
CREATE POLICY "incident_types_gestor_insert" ON public.incident_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = get_auth_school_id() 
    AND get_auth_role() = 'gestor'
    AND school_id IS NOT NULL
  );

CREATE POLICY "incident_types_gestor_update" ON public.incident_types
  FOR UPDATE
  TO authenticated
  USING (
    school_id = get_auth_school_id() 
    AND get_auth_role() = 'gestor'
    AND school_id IS NOT NULL
  )
  WITH CHECK (
    school_id = get_auth_school_id() 
    AND get_auth_role() = 'gestor'
    AND school_id IS NOT NULL
  );

CREATE POLICY "incident_types_gestor_delete" ON public.incident_types
  FOR DELETE
  TO authenticated
  USING (
    school_id = get_auth_school_id() 
    AND get_auth_role() = 'gestor'
    AND school_id IS NOT NULL
  );

-- 4. CORREÇÃO EM REPORTS (Eliminar USING (true) e isolar relatórios por escola)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_all_policy" ON public.reports;
DROP POLICY IF EXISTS "Gestores atualizam relatórios" ON public.reports;
DROP POLICY IF EXISTS "Gestores deletam relatórios" ON public.reports;
DROP POLICY IF EXISTS "reports_select_policy" ON public.reports;
DROP POLICY IF EXISTS "reports_insert_policy" ON public.reports;
DROP POLICY IF EXISTS "reports_update_policy" ON public.reports;
DROP POLICY IF EXISTS "reports_delete_policy" ON public.reports;

-- Leitura de relatórios: apenas Gestor/Admin da própria escola
CREATE POLICY "reports_select_policy" ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() IN ('gestor', 'coordenador'))
    OR get_auth_role() = 'admin'
  );

-- Criação de relatórios: apenas Gestor da própria escola ou Admin
CREATE POLICY "reports_insert_policy" ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

-- Atualização e exclusão de relatórios: apenas Gestor da própria escola ou Admin
CREATE POLICY "reports_update_policy" ON public.reports
  FOR UPDATE
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

CREATE POLICY "reports_delete_policy" ON public.reports
  FOR DELETE
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

-- 5. CORREÇÃO DE AUTORIZAÇÃO EM STUDENTS, CLASSES, GUARDIANS (Impedir que Professor delete/altere turmas e alunos)
-- STUDENTS
DROP POLICY IF EXISTS "Users access own school students" ON public.students;
DROP POLICY IF EXISTS "students_select" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_update" ON public.students;
DROP POLICY IF EXISTS "students_delete" ON public.students;

-- Leitura: Professor, Gestor e Admin podem ler alunos da própria escola
CREATE POLICY "students_select" ON public.students
  FOR SELECT
  TO authenticated
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- Inserção / Modificação / Exclusão: APENAS Gestor da própria escola ou Admin
CREATE POLICY "students_insert" ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

CREATE POLICY "students_update" ON public.students
  FOR UPDATE
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

CREATE POLICY "students_delete" ON public.students
  FOR DELETE
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

-- CLASSES
DROP POLICY IF EXISTS "Users access own school classes" ON public.classes;
DROP POLICY IF EXISTS "classes_select" ON public.classes;
DROP POLICY IF EXISTS "classes_modify" ON public.classes;

CREATE POLICY "classes_select" ON public.classes
  FOR SELECT
  TO authenticated
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

CREATE POLICY "classes_modify" ON public.classes
  FOR ALL
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

-- GUARDIANS
DROP POLICY IF EXISTS "Users access own school guardians" ON public.guardians;
DROP POLICY IF EXISTS "guardians_select" ON public.guardians;
DROP POLICY IF EXISTS "guardians_modify" ON public.guardians;

CREATE POLICY "guardians_select" ON public.guardians
  FOR SELECT
  TO authenticated
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

CREATE POLICY "guardians_modify" ON public.guardians
  FOR ALL
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

-- CLASS_STUDENTS
DROP POLICY IF EXISTS "Users access own school class_students" ON public.class_students;
DROP POLICY IF EXISTS "class_students_select" ON public.class_students;
DROP POLICY IF EXISTS "class_students_modify" ON public.class_students;

CREATE POLICY "class_students_select" ON public.class_students
  FOR SELECT
  TO authenticated
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

CREATE POLICY "class_students_modify" ON public.class_students
  FOR ALL
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

-- 6. CORREÇÃO EM INCIDENTS (Restringir exclusão para Gestor/Admin; Professor só insere e lê)
DROP POLICY IF EXISTS "Users access own school incidents" ON public.incidents;
DROP POLICY IF EXISTS "incidents_select" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insert" ON public.incidents;
DROP POLICY IF EXISTS "incidents_update" ON public.incidents;
DROP POLICY IF EXISTS "incidents_delete" ON public.incidents;

CREATE POLICY "incidents_select" ON public.incidents
  FOR SELECT
  TO authenticated
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- Professor e Gestor podem inserir ocorrências para a própria escola
CREATE POLICY "incidents_insert" ON public.incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() IN ('professor', 'gestor', 'coordenador'))
    OR get_auth_role() = 'admin'
  );

-- Gestor/Admin podem atualizar ocorrências (status, desdobramentos, etc.)
CREATE POLICY "incidents_update" ON public.incidents
  FOR UPDATE
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() IN ('gestor', 'coordenador'))
    OR get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() IN ('gestor', 'coordenador'))
    OR get_auth_role() = 'admin'
  );

-- Apenas Gestor e Admin podem deletar ocorrências
CREATE POLICY "incidents_delete" ON public.incidents
  FOR DELETE
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

-- 7. CORREÇÃO EM COMMUNICATIONS (Apenas Gestor atualiza status de WhatsApp enviado)
DROP POLICY IF EXISTS "Users access own school communications" ON public.communications;
DROP POLICY IF EXISTS "communications_select" ON public.communications;
DROP POLICY IF EXISTS "communications_insert" ON public.communications;
DROP POLICY IF EXISTS "communications_update" ON public.communications;

CREATE POLICY "communications_select" ON public.communications
  FOR SELECT
  TO authenticated
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- Inserção de comunicação: gerada pelo registro de ocorrência (Professor ou Gestor)
CREATE POLICY "communications_insert" ON public.communications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() IN ('professor', 'gestor', 'coordenador'))
    OR get_auth_role() = 'admin'
  );

-- Atualização de comunicação (marcar como enviada): APENAS Gestor
CREATE POLICY "communications_update" ON public.communications
  FOR UPDATE
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

-- 8. CORREÇÃO EM FOLLOWUPS (Apenas Gestor gerencia desdobramentos; Professor apenas lê)
DROP POLICY IF EXISTS "Gestor can do everything on followups" ON public.followups;
DROP POLICY IF EXISTS "Professor can read school followups" ON public.followups;
DROP POLICY IF EXISTS "followups_select" ON public.followups;
DROP POLICY IF EXISTS "followups_manage_gestor" ON public.followups;

CREATE POLICY "followups_select" ON public.followups
  FOR SELECT
  TO authenticated
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

CREATE POLICY "followups_manage_gestor" ON public.followups
  FOR ALL
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

-- 9. CORREÇÃO EM SCHOOLS (Garantir isolamento estrito)
DROP POLICY IF EXISTS "Admin can do everything on schools" ON public.schools;
DROP POLICY IF EXISTS "Gestor can read own school" ON public.schools;
DROP POLICY IF EXISTS "schools_admin" ON public.schools;
DROP POLICY IF EXISTS "schools_read_own" ON public.schools;

CREATE POLICY "schools_admin" ON public.schools
  FOR ALL
  TO authenticated
  USING (get_auth_role() = 'admin')
  WITH CHECK (get_auth_role() = 'admin');

CREATE POLICY "schools_read_own" ON public.schools
  FOR SELECT
  TO authenticated
  USING (
    id = get_auth_school_id() 
    AND get_auth_role() IN ('gestor', 'professor', 'coordenador')
  );

-- 10. CORREÇÃO DE STORAGE: POLÍTICAS SEGURAS PARA O BUCKET 'reports'
-- O bucket reports armazena arquivos no formato: {school_id}/{nome_do_arquivo}.pdf
-- As políticas abaixo garantem que ninguém de fora ou anônimo baixe ou suba arquivos.
-- Execute caso você utilize RLS no schema storage:
DO $$
BEGIN
  -- Se a tabela storage.objects existir, aplicar regras por school_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    
    -- Leitura no storage: apenas se o path começar com o school_id do usuário logado (ou admin)
    DROP POLICY IF EXISTS "reports_storage_select" ON storage.objects;
    CREATE POLICY "reports_storage_select" ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'reports' AND (
          (name LIKE (get_auth_school_id()::text || '/%') AND get_auth_role() IN ('gestor', 'coordenador'))
          OR get_auth_role() = 'admin'
        )
      );

    -- Upload no storage: apenas se o path for o school_id da própria escola e quem envia for gestor/admin
    DROP POLICY IF EXISTS "reports_storage_insert" ON storage.objects;
    CREATE POLICY "reports_storage_insert" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'reports' AND (
          (name LIKE (get_auth_school_id()::text || '/%') AND get_auth_role() = 'gestor')
          OR get_auth_role() = 'admin'
        )
      );

    -- Delete no storage: apenas gestor da própria escola ou admin
    DROP POLICY IF EXISTS "reports_storage_delete" ON storage.objects;
    CREATE POLICY "reports_storage_delete" ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'reports' AND (
          (name LIKE (get_auth_school_id()::text || '/%') AND get_auth_role() = 'gestor')
          OR get_auth_role() = 'admin'
        )
      );
  END IF;
END $$;

-- =================================================================================
-- FIM DA MIGRAÇÃO DE SEGURANÇA - TABELAS PRINCIPAIS
-- =================================================================================

-- 11. CLASS_TEACHERS (vínculo professor-turma)
-- RLS já habilitado no supabase.sql original.
-- Reforçar: apenas usuários autenticados da própria escola ou admin
DROP POLICY IF EXISTS "Users access own school class_teachers" ON public.class_teachers;
DROP POLICY IF EXISTS "class_teachers_select" ON public.class_teachers;
DROP POLICY IF EXISTS "class_teachers_modify" ON public.class_teachers;

CREATE POLICY "class_teachers_select" ON public.class_teachers
  FOR SELECT
  TO authenticated
  USING (school_id = get_auth_school_id() OR get_auth_role() = 'admin');

-- Apenas Gestor e Admin gerenciam vínculos professor-turma
CREATE POLICY "class_teachers_modify" ON public.class_teachers
  FOR ALL
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id = get_auth_school_id() AND get_auth_role() = 'gestor')
    OR get_auth_role() = 'admin'
  );

-- 12. INCIDENT_STATUS_LOG
-- Nenhum usuário comum deve alterar o log de status diretamente.
-- Apenas leitura para o mesmo escopo de escola, sem escrita direta.
DROP POLICY IF EXISTS "Users access incident status log" ON public.incident_status_log;
DROP POLICY IF EXISTS "incident_status_log_select" ON public.incident_status_log;
DROP POLICY IF EXISTS "incident_status_log_insert" ON public.incident_status_log;

CREATE POLICY "incident_status_log_select" ON public.incident_status_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (i.school_id = get_auth_school_id() OR get_auth_role() = 'admin')
    )
  );

-- Apenas Gestor e Admin podem inserir no log de status
CREATE POLICY "incident_status_log_insert" ON public.incident_status_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (
        (i.school_id = get_auth_school_id() AND get_auth_role() IN ('gestor', 'coordenador'))
        OR get_auth_role() = 'admin'
      )
    )
  );

-- 13. AUDIT_LOGS (log de auditoria)
-- Apenas leitura para Gestor (própria escola) e Admin. Sem escrita direta por ninguém.
DROP POLICY IF EXISTS "Users access own school audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    (school_id = get_auth_school_id() AND get_auth_role() IN ('gestor', 'coordenador'))
    OR get_auth_role() = 'admin'
  );

-- =================================================================================
-- FIM COMPLETO DA MIGRAÇÃO DE SEGURANÇA — MIGRATION 6
-- =================================================================================

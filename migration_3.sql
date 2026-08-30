-- ============================================================
-- MIGRATION 3 — VERSÃO FINAL COMPLETA
-- Execute este script inteiro no SQL Editor do Supabase
-- ============================================================

-- =============================================
-- 1. TABELA STUDENTS — Colunas faltando
-- =============================================
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enrollment TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_phone TEXT;

-- Normalizar shift (português → inglês) ANTES da constraint
UPDATE public.students SET shift = 'morning'   WHERE shift IN ('Manhã', 'manha', 'manhã', 'MANHÃ') OR shift IS NULL OR shift NOT IN ('morning', 'afternoon', 'night');
UPDATE public.students SET shift = 'afternoon' WHERE shift IN ('Tarde', 'tarde', 'TARDE');
UPDATE public.students SET shift = 'night'     WHERE shift IN ('Noite', 'noite', 'NOITE');

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_shift_check;
ALTER TABLE public.students ALTER COLUMN shift SET DEFAULT 'morning';
ALTER TABLE public.students ADD CONSTRAINT students_shift_check
  CHECK (shift IN ('morning', 'afternoon', 'night'));

-- Status dos alunos
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;
UPDATE public.students SET status = 'active' WHERE status IS NULL OR status NOT IN ('active', 'inactive');
ALTER TABLE public.students ADD CONSTRAINT students_status_check
  CHECK (status IN ('active', 'inactive'));

-- =============================================
-- 2. TABELA INCIDENTS — Colunas + constraints
-- =============================================
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_date_only DATE;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_time TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_types_list JSONB DEFAULT '[]';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS outros_description TEXT;

-- Remover NOT NULL onde não deveria existir
ALTER TABLE public.incidents ALTER COLUMN incident_type_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'incidents' AND column_name = 'type_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.incidents ALTER COLUMN type_id DROP NOT NULL';
  END IF;
END $$;

-- Normalizar severity existente antes da constraint
UPDATE public.incidents SET severity = 'low'    WHERE severity IN ('baixa', 'Baixa', 'BAIXA');
UPDATE public.incidents SET severity = 'medium' WHERE severity IN ('média', 'media', 'Média', 'Media', 'MEDIA');
UPDATE public.incidents SET severity = 'high'   WHERE severity IN ('alta', 'Alta', 'ALTA');
UPDATE public.incidents SET severity = 'low'    WHERE severity IS NULL OR severity NOT IN ('low', 'medium', 'high');

ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;
ALTER TABLE public.incidents ALTER COLUMN severity SET DEFAULT 'low';
ALTER TABLE public.incidents ADD CONSTRAINT incidents_severity_check
  CHECK (severity IN ('low', 'medium', 'high'));

-- Normalizar status existente antes da constraint
UPDATE public.incidents SET status = 'pending'     WHERE status IN ('pendente', 'Pendente', 'PENDENTE');
UPDATE public.incidents SET status = 'in_progress' WHERE status IN ('em_acompanhamento', 'em andamento', 'Em Andamento');
UPDATE public.incidents SET status = 'resolved'    WHERE status IN ('resolvido', 'Resolvido', 'RESOLVIDO');
UPDATE public.incidents SET status = 'pending'     WHERE status IS NULL OR status NOT IN ('pending', 'in_progress', 'resolved');

ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE public.incidents ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.incidents ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('pending', 'in_progress', 'resolved'));

-- =============================================
-- 3. TABELA INCIDENT_TYPES
-- =============================================
ALTER TABLE public.incident_types ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.incident_types ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE public.incident_types ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'school';

UPDATE public.incident_types SET scope = 'global', is_default = TRUE WHERE school_id IS NULL;
UPDATE public.incident_types SET scope = 'school' WHERE school_id IS NOT NULL;

-- =============================================
-- 4. TABELA COMMUNICATIONS
-- =============================================
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS teacher_name TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS incident_time TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS incident_date_only DATE;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS incident_types_list JSONB DEFAULT '[]';
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS outros_description TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

-- =============================================
-- 5. TABELA CLASSES
-- =============================================
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- =============================================
-- 6. RLS POLICIES
-- =============================================

-- INCIDENT_TYPES: SELECT
DROP POLICY IF EXISTS "Users access incident types" ON public.incident_types;
CREATE POLICY "Users access incident types" ON public.incident_types
  FOR SELECT USING (
    school_id IS NULL
    OR school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INCIDENT_TYPES: INSERT
DROP POLICY IF EXISTS "Admin and Gestor insert incident types" ON public.incident_types;
CREATE POLICY "Admin and Gestor insert incident types" ON public.incident_types
  FOR INSERT WITH CHECK (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor')
      AND school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- INCIDENT_TYPES: UPDATE
DROP POLICY IF EXISTS "Admin and Gestor update incident types" ON public.incident_types;
CREATE POLICY "Admin and Gestor update incident types" ON public.incident_types
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor')
      AND school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- INCIDENT_TYPES: DELETE
DROP POLICY IF EXISTS "Admin and Gestor delete incident types" ON public.incident_types;
CREATE POLICY "Admin and Gestor delete incident types" ON public.incident_types
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor')
      AND school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- INCIDENTS: INSERT
DROP POLICY IF EXISTS "Users insert incidents" ON public.incidents;
CREATE POLICY "Users insert incidents" ON public.incidents
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- COMMUNICATIONS: INSERT
DROP POLICY IF EXISTS "Users insert communications" ON public.communications;
CREATE POLICY "Users insert communications" ON public.communications
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- COMMUNICATIONS: UPDATE
DROP POLICY IF EXISTS "Users update communications" ON public.communications;
CREATE POLICY "Users update communications" ON public.communications
  FOR UPDATE USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CLASSES: INSERT
DROP POLICY IF EXISTS "Gestor insert classes" ON public.classes;
CREATE POLICY "Gestor insert classes" ON public.classes
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CLASS_STUDENTS: INSERT
DROP POLICY IF EXISTS "Users insert class_students" ON public.class_students;
CREATE POLICY "Users insert class_students" ON public.class_students
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- STUDENTS: INSERT
DROP POLICY IF EXISTS "Users insert students" ON public.students;
CREATE POLICY "Users insert students" ON public.students
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- 7. DADOS INICIAIS — 10 tipos padrão globais
-- =============================================
DELETE FROM public.incident_types WHERE school_id IS NULL;

INSERT INTO public.incident_types (name, description, is_default, scope, school_id, active) VALUES
  ('Uso indevido de celular', 'Utilização do celular durante a aula sem autorização.', TRUE, 'global', NULL, TRUE),
  ('Não realizou as tarefas', 'Aluno não realizou a atividade ou tarefa solicitada.', TRUE, 'global', NULL, TRUE),
  ('Atraso', 'Aluno chegou após o início da aula.', TRUE, 'global', NULL, TRUE),
  ('Falta de material escolar', 'Aluno sem material necessário para a aula.', TRUE, 'global', NULL, TRUE),
  ('Conversas excessivas durante a aula', 'Aluno conversando de forma que prejudica a aprendizagem.', TRUE, 'global', NULL, TRUE),
  ('Desrespeito ao professor', 'Desrespeito verbal ou comportamental ao professor.', TRUE, 'global', NULL, TRUE),
  ('Desrespeito aos colegas', 'Comportamento ofensivo ou agressivo com colegas.', TRUE, 'global', NULL, TRUE),
  ('Comportamento inadequado', 'Comportamento fora das normas da escola.', TRUE, 'global', NULL, TRUE),
  ('Não participou das atividades', 'Aluno com baixo engajamento nas atividades propostas.', TRUE, 'global', NULL, TRUE),
  ('Outros', 'Descreva a ocorrência no campo de observações.', TRUE, 'global', NULL, TRUE)
ON CONFLICT DO NOTHING;

-- =============================================
-- FIM DO SCRIPT
-- =============================================

-- ============================================================
-- MIGRATION 3 — FIX: Normalizar shift antes de aplicar constraint
-- Execute este script COMPLETO no SQL Editor do Supabase
-- ============================================================

-- 1. Adicionar colunas de students (sem mexer em shift ainda)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enrollment TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_phone TEXT;

-- 2. PRIMEIRO: normalizar os valores existentes de shift (português → inglês)
UPDATE public.students SET shift = 'morning'   WHERE shift IN ('Manhã', 'manha', 'manhã', 'MANHÃ', 'morning');
UPDATE public.students SET shift = 'afternoon' WHERE shift IN ('Tarde', 'tarde', 'TARDE', 'afternoon');
UPDATE public.students SET shift = 'night'     WHERE shift IN ('Noite', 'noite', 'NOITE', 'night');
-- Qualquer outro valor vira 'morning' como padrão seguro
UPDATE public.students SET shift = 'morning' WHERE shift NOT IN ('morning', 'afternoon', 'night') OR shift IS NULL;

-- 3. AGORA aplicar a constraint (sem valores inválidos)
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_shift_check;
ALTER TABLE public.students ALTER COLUMN shift SET DEFAULT 'morning';
ALTER TABLE public.students ADD CONSTRAINT students_shift_check
  CHECK (shift IN ('morning', 'afternoon', 'night'));

-- 4. Status constraint
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_status_check
  CHECK (status IN ('active', 'inactive'));

-- =============================================
-- TABELA INCIDENTS — Colunas faltando + severity fix
-- =============================================
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_date_only DATE;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_time TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_types_list JSONB DEFAULT '[]';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS outros_description TEXT;

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

-- Normalizar severity existente antes de aplicar constraint
UPDATE public.incidents SET severity = 'low'    WHERE severity IN ('baixa', 'Baixa', 'BAIXA');
UPDATE public.incidents SET severity = 'medium' WHERE severity IN ('média', 'media', 'Média', 'Media', 'MEDIA');
UPDATE public.incidents SET severity = 'high'   WHERE severity IN ('alta', 'Alta', 'ALTA');
UPDATE public.incidents SET severity = 'low' WHERE severity NOT IN ('low', 'medium', 'high') OR severity IS NULL;

ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;
ALTER TABLE public.incidents ALTER COLUMN severity SET DEFAULT 'low';
ALTER TABLE public.incidents ADD CONSTRAINT incidents_severity_check
  CHECK (severity IN ('low', 'medium', 'high'));

-- =============================================
-- TABELA INCIDENT_TYPES — Scope e colunas
-- =============================================
ALTER TABLE public.incident_types ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.incident_types ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE public.incident_types ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'school';

UPDATE public.incident_types SET scope = 'global', is_default = TRUE WHERE school_id IS NULL;
UPDATE public.incident_types SET scope = 'school' WHERE school_id IS NOT NULL;

-- =============================================
-- TABELA COMMUNICATIONS — Colunas faltando
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
-- TABELA CLASSES
-- =============================================
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- =============================================
-- RLS POLICIES — Recriar
-- =============================================
DROP POLICY IF EXISTS "Users access incident types" ON public.incident_types;
CREATE POLICY "Users access incident types" ON public.incident_types
  FOR SELECT USING (
    school_id IS NULL
    OR school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin and Gestor insert incident types" ON public.incident_types;
CREATE POLICY "Admin and Gestor insert incident types" ON public.incident_types
  FOR INSERT WITH CHECK (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor')
      AND school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admin and Gestor update incident types" ON public.incident_types;
CREATE POLICY "Admin and Gestor update incident types" ON public.incident_types
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor')
      AND school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admin and Gestor delete incident types" ON public.incident_types;
CREATE POLICY "Admin and Gestor delete incident types" ON public.incident_types
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor')
      AND school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users insert incidents" ON public.incidents;
CREATE POLICY "Users insert incidents" ON public.incidents
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users insert communications" ON public.communications;
CREATE POLICY "Users insert communications" ON public.communications
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users update communications" ON public.communications;
CREATE POLICY "Users update communications" ON public.communications
  FOR UPDATE USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Gestor insert classes" ON public.classes;
CREATE POLICY "Gestor insert classes" ON public.classes
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users insert class_students" ON public.class_students;
CREATE POLICY "Users insert class_students" ON public.class_students
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users insert students" ON public.students;
CREATE POLICY "Users insert students" ON public.students
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- DADOS INICIAIS — 10 tipos padrão globais
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

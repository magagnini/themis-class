-- ============================================================
-- THEMIS CLASS — MIGRATIONS (Megapacote de Atualizações)
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Adicionar max_professors na tabela schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS max_professors INTEGER DEFAULT 30;

-- 2. Adicionar campos de responsável na tabela students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Adicionar campos de disciplina e horário na tabela incidents
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_time TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_types_list JSONB DEFAULT '[]';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS outros_description TEXT;

-- 4. Corrigir coluna incident_date para aceitar apenas date
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_date_only DATE;

-- 5. Adicionar colunas extras em communications
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS incident_id_ref UUID REFERENCES public.incidents(id) ON DELETE SET NULL;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS teacher_name TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS incident_time TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS incident_types_list JSONB DEFAULT '[]';
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS outros_description TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

-- 6. Inserir os 10 tipos de ocorrência padrão (se não existirem)
INSERT INTO public.incident_types (name, description, is_default, active, school_id)
SELECT name, description, TRUE, TRUE, NULL
FROM (VALUES
  ('Uso indevido de celular', 'Utilização do celular durante a aula sem autorização.'),
  ('Não realizou as tarefas', 'Aluno não realizou a atividade ou tarefa solicitada pelo professor.'),
  ('Atraso', 'Aluno chegou após o início da aula.'),
  ('Falta de material escolar', 'Aluno veio à aula sem os materiais necessários.'),
  ('Conversas excessivas durante a aula', 'Aluno conversando de forma que prejudica o andamento da aula.'),
  ('Desrespeito ao professor', 'Comportamento desrespeitoso ou insubordinação ao professor.'),
  ('Desrespeito aos colegas', 'Comportamento desrespeitoso, bullying ou conflito com colegas.'),
  ('Comportamento inadequado', 'Comportamento inapropriado para o ambiente escolar.'),
  ('Não participou das atividades', 'Aluno se recusou ou se omitiu das atividades propostas.'),
  ('Outros', 'Ocorrência com descrição livre pelo professor.')
) AS t(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.incident_types WHERE name = t.name AND school_id IS NULL
);

-- 7. Adicionar constraint UNIQUE para evitar turmas duplicadas por escola
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_class_name_school' 
    AND table_name = 'classes'
  ) THEN
    ALTER TABLE public.classes ADD CONSTRAINT unique_class_name_school UNIQUE (school_id, name);
  END IF;
END $$;

-- 8. RLS: garantir que professores só vejam dados de sua escola
-- (ajuste das políticas existentes)

-- Política de incidents para professores verem apenas da sua escola
DROP POLICY IF EXISTS "professors_see_own_school_incidents" ON public.incidents;
CREATE POLICY "professors_see_own_school_incidents"
  ON public.incidents FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Política de students para professores verem apenas da sua escola
DROP POLICY IF EXISTS "professors_see_own_school_students" ON public.students;
CREATE POLICY "professors_see_own_school_students"
  ON public.students FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

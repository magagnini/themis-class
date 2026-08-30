-- ============================================================
-- THEMIS CLASS — MIGRATION 3 (Correções Arquiteturais)
-- ============================================================

-- 1. Tabela STUDENTS: Garantir colunas que podem estar faltando
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enrollment TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'morning' CHECK (shift IN ('morning', 'afternoon', 'night'));
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_name TEXT;

-- 2. Tabela INCIDENTS: Ajustes cruciais
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_date_only DATE;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_time TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_types_list JSONB DEFAULT '[]';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS outros_description TEXT;

-- Remover a obrigatoriedade da coluna incident_type_id (já que agora podemos ter MÚLTIPLOS no JSONB)
ALTER TABLE public.incidents ALTER COLUMN incident_type_id DROP NOT NULL;

-- Caso o usuário tenha criado acidentalmente uma coluna chamada "type_id" com NOT NULL, remover a obrigatoriedade:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'type_id') THEN
    EXECUTE 'ALTER TABLE public.incidents ALTER COLUMN type_id DROP NOT NULL';
  END IF;
END $$;

-- 3. Tabela INCIDENTS: Corrigir a validação de severidade (severity)
ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;
ALTER TABLE public.incidents ALTER COLUMN severity DROP NOT NULL;
ALTER TABLE public.incidents ALTER COLUMN severity SET DEFAULT 'low';
ALTER TABLE public.incidents ADD CONSTRAINT incidents_severity_check 
  CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high', 'baixa', 'média', 'alta'));

-- 4. Tabela INCIDENT_TYPES: Scope e visibilidade
ALTER TABLE public.incident_types ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.incident_types ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

DROP POLICY IF EXISTS "Users access incident types" ON public.incident_types;
CREATE POLICY "Users access incident types" ON public.incident_types
  USING (
    school_id IS NULL -- tipos padrão da plataforma (GLOBAL)
    OR school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin and Gestor insert incident types" ON public.incident_types;
CREATE POLICY "Admin and Gestor insert incident types" ON public.incident_types
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor') AND school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Admin and Gestor update incident types" ON public.incident_types;
CREATE POLICY "Admin and Gestor update incident types" ON public.incident_types
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor') AND school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  );
  
DROP POLICY IF EXISTS "Admin and Gestor delete incident types" ON public.incident_types;
CREATE POLICY "Admin and Gestor delete incident types" ON public.incident_types
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor') AND school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  );

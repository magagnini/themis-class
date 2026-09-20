-- =================================================================================
-- MIGRATION 5: MÓDULO DESDOBRAMENTOS
-- Execute este script no Supabase SQL Editor
-- =================================================================================

-- 1. TABELA followup_types (tipos de desdobramento)
CREATE TABLE IF NOT EXISTS public.followup_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE, -- NULL = global (admin)
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA followups (desdobramentos realizados)
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  followup_1 UUID REFERENCES public.followup_types(id) ON DELETE SET NULL,
  followup_2 UUID REFERENCES public.followup_types(id) ON DELETE SET NULL,
  followup_3 UUID REFERENCES public.followup_types(id) ON DELETE SET NULL,
  followup_4 UUID REFERENCES public.followup_types(id) ON DELETE SET NULL,
  complementacao TEXT CHECK (char_length(complementacao) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_followups_school_id ON public.followups(school_id);
CREATE INDEX IF NOT EXISTS idx_followups_student_id ON public.followups(student_id);
CREATE INDEX IF NOT EXISTS idx_followups_incident_id ON public.followups(incident_id);
CREATE INDEX IF NOT EXISTS idx_followups_created_at ON public.followups(created_at);
CREATE INDEX IF NOT EXISTS idx_followup_types_school_id ON public.followup_types(school_id);

-- Índices em incidents (melhoria de performance)
CREATE INDEX IF NOT EXISTS idx_incidents_student_id ON public.incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_incidents_school_id ON public.incidents(school_id);
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date ON public.incidents(incident_date);

-- 4. RLS - followup_types
ALTER TABLE public.followup_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone logged in can read active followup_types" ON public.followup_types;
CREATE POLICY "Anyone logged in can read active followup_types" ON public.followup_types
  FOR SELECT USING (
    active = TRUE AND (
      school_id IS NULL -- tipos globais visíveis para todos
      OR school_id = get_auth_school_id() -- tipos da própria escola
      OR get_auth_role() = 'admin' -- admin vê tudo
    )
  );

DROP POLICY IF EXISTS "Admin can manage global followup_types" ON public.followup_types;
CREATE POLICY "Admin can manage global followup_types" ON public.followup_types
  USING (get_auth_role() = 'admin');

DROP POLICY IF EXISTS "Gestor can manage own school followup_types" ON public.followup_types;
CREATE POLICY "Gestor can manage own school followup_types" ON public.followup_types
  FOR ALL USING (
    school_id = get_auth_school_id() AND get_auth_role() = 'gestor'
  );

-- 5. RLS - followups
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestor can do everything on followups" ON public.followups;
CREATE POLICY "Gestor can do everything on followups" ON public.followups
  USING (
    school_id = get_auth_school_id()
    OR get_auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "Professor can read school followups" ON public.followups;
CREATE POLICY "Professor can read school followups" ON public.followups
  FOR SELECT USING (school_id = get_auth_school_id());

-- 6. DADOS INICIAIS — tipos globais de desdobramento
INSERT INTO public.followup_types (school_id, name, description, active, is_global) VALUES
  (NULL, 'Conversa com o aluno', 'Conversa individual com o aluno sobre o comportamento.', TRUE, TRUE),
  (NULL, 'Contato com responsável', 'Contato telefônico ou presencial com o responsável pelo aluno.', TRUE, TRUE),
  (NULL, 'Orientação pedagógica', 'Orientação realizada pela equipe pedagógica.', TRUE, TRUE),
  (NULL, 'Encaminhamento para coordenação', 'Encaminhamento do aluno à coordenação pedagógica.', TRUE, TRUE),
  (NULL, 'Reunião com responsável', 'Reunião formal com o responsável na escola.', TRUE, TRUE),
  (NULL, 'Advertência formal', 'Emissão de advertência formal ao aluno.', TRUE, TRUE),
  (NULL, 'Acompanhamento individual', 'Plano de acompanhamento individual do aluno.', TRUE, TRUE),
  (NULL, 'Encaminhamento à direção', 'Encaminhamento do caso à direção escolar.', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- =================================================================================
-- FIM DA MIGRAÇÃO 5
-- =================================================================================

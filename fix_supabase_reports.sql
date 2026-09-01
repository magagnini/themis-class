-- ============================================================
-- THEMIS CLASS — CORREÇÃO COMPLETA DE RELATÓRIOS & STORAGE
-- Execute no SQL Editor do Supabase (Basta colar e clicar em "RUN")
-- ============================================================

-- 1. EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. GARANTIR COLUNAS NA TABELA INCIDENTS
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS student_age INTEGER;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_date_only DATE;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_time TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_types_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS outros_description TEXT;

-- 3. CRIAR OU ATUALIZAR TABELA REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  report_type TEXT DEFAULT 'general',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_students INTEGER DEFAULT 0,
  total_incidents INTEGER DEFAULT 0,
  file_path TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas na tabela reports se já existia
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'general';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 4. HABILITAR RLS E CRIAR POLÍTICAS PERMISSIVAS PARA TABELA REPORTS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_policy" ON public.reports;
CREATE POLICY "reports_select_policy" ON public.reports
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "reports_insert_policy" ON public.reports;
CREATE POLICY "reports_insert_policy" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "reports_update_policy" ON public.reports;
CREATE POLICY "reports_update_policy" ON public.reports
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "reports_delete_policy" ON public.reports;
CREATE POLICY "reports_delete_policy" ON public.reports
  FOR DELETE TO authenticated
  USING (true);

-- 5. CONFIGURAÇÃO DO BUCKET DE STORAGE "reports"
-- Cria o bucket reports público caso não exista
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reports', 'reports', true, 52428800, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. POLÍTICAS DE ACESSO AO STORAGE PARA O BUCKET "reports"
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated download reports" ON storage.objects;
CREATE POLICY "Allow authenticated download reports" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'reports');

DROP POLICY IF EXISTS "Allow authenticated upload reports" ON storage.objects;
CREATE POLICY "Allow authenticated upload reports" ON storage.objects
  FOR INSERT TO authenticated, anon
  WITH CHECK (bucket_id = 'reports');

DROP POLICY IF EXISTS "Allow authenticated update reports" ON storage.objects;
CREATE POLICY "Allow authenticated update reports" ON storage.objects
  FOR UPDATE TO authenticated, anon
  USING (bucket_id = 'reports');

DROP POLICY IF EXISTS "Allow authenticated delete reports" ON storage.objects;
CREATE POLICY "Allow authenticated delete reports" ON storage.objects
  FOR DELETE TO authenticated, anon
  USING (bucket_id = 'reports');

-- 7. RECARREGAR AS 51 OCORRÊNCIAS GLOBAIS DO PLACON
DELETE FROM public.incident_types WHERE school_id IS NULL;

INSERT INTO public.incident_types (name, description, is_default, school_id, active) VALUES
('Acidentes e Eventos Inesperados', 'Acidentes e Eventos Inesperados', TRUE, NULL, TRUE),
('Agressão Física', 'Agressão Física', TRUE, NULL, TRUE),
('Alerta de Desaparecimento', 'Alerta de Desaparecimento', TRUE, NULL, TRUE),
('Ameaça de Ataque Ativo', 'Ameaça de Ataque Ativo', TRUE, NULL, TRUE),
('Apologia ao Nazismo', 'Apologia ao Nazismo', TRUE, NULL, TRUE),
('Assédio Moral', 'Assédio Moral', TRUE, NULL, TRUE),
('Assédio Sexual', 'Assédio Sexual', TRUE, NULL, TRUE),
('Ataque Ativo Concretizado', 'Ataque Ativo Concretizado', TRUE, NULL, TRUE),
('Atos Obscenos / Atos Libidinosos', 'Atos Obscenos / Atos Libidinosos', TRUE, NULL, TRUE),
('Bullying e Cyberbullying', 'Bullying e Cyberbullying', TRUE, NULL, TRUE),
('Comercialização de Álcool e Tabaco', 'Comercialização de Álcool e Tabaco', TRUE, NULL, TRUE),
('Comunicação Violenta / Conflito Verbal', 'Comunicação Violenta / Conflito Verbal', TRUE, NULL, TRUE),
('Consumo de Álcool e Tabaco', 'Consumo de Álcool e Tabaco', TRUE, NULL, TRUE),
('Consumo de Cigarro Eletrônico', 'Consumo de Cigarro Eletrônico', TRUE, NULL, TRUE),
('Consumo de Substâncias Ilícitas', 'Consumo de Substâncias Ilícitas', TRUE, NULL, TRUE),
('Crimes Cibernéticos', 'Crimes Cibernéticos', TRUE, NULL, TRUE),
('Danos ao Patrimônio', 'Danos ao Patrimônio', TRUE, NULL, TRUE),
('Envolvimento com Tráfico de Drogas Ilícitas e Psicoativas', 'Envolvimento com Tráfico de Drogas Ilícitas e Psicoativas', TRUE, NULL, TRUE),
('Evasão Escolar', 'Evasão Escolar', TRUE, NULL, TRUE),
('Fake News – Disseminação de Informações Falsas', 'Fake News – Disseminação de Informações Falsas', TRUE, NULL, TRUE),
('Feminicídio', 'Feminicídio', TRUE, NULL, TRUE),
('Furto', 'Furto', TRUE, NULL, TRUE),
('Gordofobia', 'Gordofobia', TRUE, NULL, TRUE),
('Homicídio / Homicídio Tentado', 'Homicídio / Homicídio Tentado', TRUE, NULL, TRUE),
('Homofobia', 'Homofobia', TRUE, NULL, TRUE),
('Importunação Sexual / Estupro', 'Importunação Sexual / Estupro', TRUE, NULL, TRUE),
('Incitamento e Associação a Atos Infracionais / Crimes', 'Incitamento e Associação a Atos Infracionais / Crimes', TRUE, NULL, TRUE),
('Indisciplina', 'Indisciplina', TRUE, NULL, TRUE),
('Invasão', 'Invasão', TRUE, NULL, TRUE),
('Mal Súbito', 'Mal Súbito', TRUE, NULL, TRUE),
('Óbito', 'Óbito', TRUE, NULL, TRUE),
('Ocupação de Unidade Escolar', 'Ocupação de Unidade Escolar', TRUE, NULL, TRUE),
('Posse de Arma Branca', 'Posse de Arma Branca', TRUE, NULL, TRUE),
('Posse de Arma de Brinquedo', 'Posse de Arma de Brinquedo', TRUE, NULL, TRUE),
('Posse de Arma de Fogo / Simulacro', 'Posse de Arma de Fogo / Simulacro', TRUE, NULL, TRUE),
('Racismo', 'Racismo', TRUE, NULL, TRUE),
('Roubo', 'Roubo', TRUE, NULL, TRUE),
('Sequestro', 'Sequestro', TRUE, NULL, TRUE),
('Sinais de Alterações Emocionais (Irritabilidade, Agressividade, Ansiedade, Pânico)', 'Sinais de Alterações Emocionais (Irritabilidade, Agressividade, Ansiedade, Pânico)', TRUE, NULL, TRUE),
('Sinais de Automutilação', 'Sinais de Automutilação', TRUE, NULL, TRUE),
('Sinais de Isolamento Social', 'Sinais de Isolamento Social', TRUE, NULL, TRUE),
('Situação de Ameaça', 'Situação de Ameaça', TRUE, NULL, TRUE),
('Suicídio Concretizado', 'Suicídio Concretizado', TRUE, NULL, TRUE),
('Tentativa de Suicídio', 'Tentativa de Suicídio', TRUE, NULL, TRUE),
('Transfobia', 'Transfobia', TRUE, NULL, TRUE),
('Uso Inadequado de Dispositivos Eletrônicos', 'Uso Inadequado de Dispositivos Eletrônicos', TRUE, NULL, TRUE),
('Violência de Gênero contra Meninas e Mulheres', 'Violência de Gênero contra Meninas e Mulheres', TRUE, NULL, TRUE),
('Violência Doméstica / Maus Tratos', 'Violência Doméstica / Maus Tratos', TRUE, NULL, TRUE),
('Vulnerabilidade Familiar / Cuidados Parentais', 'Vulnerabilidade Familiar / Cuidados Parentais', TRUE, NULL, TRUE),
('Xenofobia', 'Xenofobia', TRUE, NULL, TRUE),
('Outros', 'Descreva a ocorrência no campo de observações', TRUE, NULL, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================

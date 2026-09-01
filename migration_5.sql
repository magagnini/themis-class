-- ============================================================
-- MIGRATION 5 — NOVAS OCORRÊNCIAS GLOBAIS E CAMPO DE IDADE
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Adicionar campo 'student_age' na tabela incidents, caso seja necessário buscar depois
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS student_age INTEGER;

-- Adicionar tipo e student_id na tabela reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'general';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;

-- 2. Atualizar os tipos de ocorrência globais (is_default = true)
DELETE FROM public.incident_types WHERE school_id IS NULL AND is_default = TRUE;

INSERT INTO public.incident_types (name, description, is_default, scope, school_id, active) VALUES
('Acidentes e Eventos Inesperados', 'Acidentes e Eventos Inesperados', TRUE, 'global', NULL, TRUE),
('Agressão Física', 'Agressão Física', TRUE, 'global', NULL, TRUE),
('Alerta de Desaparecimento', 'Alerta de Desaparecimento', TRUE, 'global', NULL, TRUE),
('Ameaça de Ataque Ativo', 'Ameaça de Ataque Ativo', TRUE, 'global', NULL, TRUE),
('Apologia ao Nazismo', 'Apologia ao Nazismo', TRUE, 'global', NULL, TRUE),
('Assédio Moral', 'Assédio Moral', TRUE, 'global', NULL, TRUE),
('Assédio Sexual', 'Assédio Sexual', TRUE, 'global', NULL, TRUE),
('Ataque Ativo Concretizado', 'Ataque Ativo Concretizado', TRUE, 'global', NULL, TRUE),
('Atos Obscenos / Atos Libidinosos', 'Atos Obscenos / Atos Libidinosos', TRUE, 'global', NULL, TRUE),
('Bullying e Cyberbullying', 'Bullying e Cyberbullying', TRUE, 'global', NULL, TRUE),
('Comercialização de Álcool e Tabaco', 'Comercialização de Álcool e Tabaco', TRUE, 'global', NULL, TRUE),
('Comunicação Violenta / Conflito Verbal', 'Comunicação Violenta / Conflito Verbal', TRUE, 'global', NULL, TRUE),
('Consumo de Álcool e Tabaco', 'Consumo de Álcool e Tabaco', TRUE, 'global', NULL, TRUE),
('Consumo de Cigarro Eletrônico', 'Consumo de Cigarro Eletrônico', TRUE, 'global', NULL, TRUE),
('Consumo de Substâncias Ilícitas', 'Consumo de Substâncias Ilícitas', TRUE, 'global', NULL, TRUE),
('Crimes Cibernéticos', 'Crimes Cibernéticos', TRUE, 'global', NULL, TRUE),
('Danos ao Patrimônio', 'Danos ao Patrimônio', TRUE, 'global', NULL, TRUE),
('Envolvimento com Tráfico de Drogas Ilícitas e Psicoativas', 'Envolvimento com Tráfico de Drogas Ilícitas e Psicoativas', TRUE, 'global', NULL, TRUE),
('Evasão Escolar', 'Evasão Escolar', TRUE, 'global', NULL, TRUE),
('Fake News – Disseminação de Informações Falsas', 'Fake News – Disseminação de Informações Falsas', TRUE, 'global', NULL, TRUE),
('Feminicídio', 'Feminicídio', TRUE, 'global', NULL, TRUE),
('Furto', 'Furto', TRUE, 'global', NULL, TRUE),
('Gordofobia', 'Gordofobia', TRUE, 'global', NULL, TRUE),
('Homicídio / Homicídio Tentado', 'Homicídio / Homicídio Tentado', TRUE, 'global', NULL, TRUE),
('Homofobia', 'Homofobia', TRUE, 'global', NULL, TRUE),
('Importunação Sexual / Estupro', 'Importunação Sexual / Estupro', TRUE, 'global', NULL, TRUE),
('Incitamento e Associação a Atos Infracionais / Crimes', 'Incitamento e Associação a Atos Infracionais / Crimes', TRUE, 'global', NULL, TRUE),
('Indisciplina', 'Indisciplina', TRUE, 'global', NULL, TRUE),
('Invasão', 'Invasão', TRUE, 'global', NULL, TRUE),
('Mal Súbito', 'Mal Súbito', TRUE, 'global', NULL, TRUE),
('Óbito', 'Óbito', TRUE, 'global', NULL, TRUE),
('Ocupação de Unidade Escolar', 'Ocupação de Unidade Escolar', TRUE, 'global', NULL, TRUE),
('Posse de Arma Branca', 'Posse de Arma Branca', TRUE, 'global', NULL, TRUE),
('Posse de Arma de Brinquedo', 'Posse de Arma de Brinquedo', TRUE, 'global', NULL, TRUE),
('Posse de Arma de Fogo / Simulacro', 'Posse de Arma de Fogo / Simulacro', TRUE, 'global', NULL, TRUE),
('Racismo', 'Racismo', TRUE, 'global', NULL, TRUE),
('Roubo', 'Roubo', TRUE, 'global', NULL, TRUE),
('Sequestro', 'Sequestro', TRUE, 'global', NULL, TRUE),
('Sinais de Alterações Emocionais (Irritabilidade, Agressividade, Ansiedade, Pânico)', 'Sinais de Alterações Emocionais (Irritabilidade, Agressividade, Ansiedade, Pânico)', TRUE, 'global', NULL, TRUE),
('Sinais de Automutilação', 'Sinais de Automutilação', TRUE, 'global', NULL, TRUE),
('Sinais de Isolamento Social', 'Sinais de Isolamento Social', TRUE, 'global', NULL, TRUE),
('Situação de Ameaça', 'Situação de Ameaça', TRUE, 'global', NULL, TRUE),
('Suicídio Concretizado', 'Suicídio Concretizado', TRUE, 'global', NULL, TRUE),
('Tentativa de Suicídio', 'Tentativa de Suicídio', TRUE, 'global', NULL, TRUE),
('Transfobia', 'Transfobia', TRUE, 'global', NULL, TRUE),
('Uso Inadequado de Dispositivos Eletrônicos', 'Uso Inadequado de Dispositivos Eletrônicos', TRUE, 'global', NULL, TRUE),
('Violência de Gênero contra Meninas e Mulheres', 'Violência de Gênero contra Meninas e Mulheres', TRUE, 'global', NULL, TRUE),
('Violência Doméstica / Maus Tratos', 'Violência Doméstica / Maus Tratos', TRUE, 'global', NULL, TRUE),
('Vulnerabilidade Familiar / Cuidados Parentais', 'Vulnerabilidade Familiar / Cuidados Parentais', TRUE, 'global', NULL, TRUE),
('Xenofobia', 'Xenofobia', TRUE, 'global', NULL, TRUE),
('Outros', 'Descreva a ocorrência no campo de observações', TRUE, 'global', NULL, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================

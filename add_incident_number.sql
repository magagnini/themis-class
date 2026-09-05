-- ============================================================
-- ADICIONAR NÚMERO DE OCORRÊNCIA ÚNICO / SEQUENCIAL
-- Execute no SQL Editor do Supabase se desejar criar as colunas explicitamente
-- ============================================================

ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_number TEXT;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS incident_number TEXT;

-- ============================================================
-- MIGRATION 4 — RELATÓRIOS SEMANAIS + STORAGE
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Criar tabela de relatórios
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_students INTEGER DEFAULT 0,
  total_incidents INTEGER DEFAULT 0,
  file_path TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT reports_status_check CHECK (status IN ('available', 'expired', 'error'))
);

-- 2. Habilitar RLS na tabela reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para reports
DROP POLICY IF EXISTS "Gestores veem seus relatórios" ON public.reports;
CREATE POLICY "Gestores veem seus relatórios" ON public.reports
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Gestores inserem relatórios" ON public.reports;
CREATE POLICY "Gestores inserem relatórios" ON public.reports
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Gestores atualizam relatórios" ON public.reports;
CREATE POLICY "Gestores atualizam relatórios" ON public.reports
  FOR UPDATE USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Gestores deletam relatórios" ON public.reports;
CREATE POLICY "Gestores deletam relatórios" ON public.reports
  FOR DELETE USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Criar bucket de storage para relatórios (execute via Dashboard do Supabase Storage se este comando falhar)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false) ON CONFLICT DO NOTHING;

-- 5. Políticas de Storage para o bucket "reports"
-- Crie manualmente no Dashboard: Storage > reports > Policies
-- Policy SELECT: auth.role() = 'authenticated'
-- Policy INSERT: auth.role() = 'authenticated'
-- Policy DELETE: auth.role() = 'authenticated'

-- 6. Função de limpeza automática de relatórios expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marcar relatórios como expirados (a exclusão do arquivo Storage é feita pelo frontend/edge function)
  UPDATE public.reports
  SET status = 'expired'
  WHERE expires_at < NOW()
    AND status = 'available';
END;
$$;

-- 7. Agendar limpeza diária com pg_cron (precisa de extensão pg_cron habilitada)
-- Para habilitar: Dashboard > Database > Extensions > pg_cron
-- Depois executar:
-- SELECT cron.schedule('cleanup-expired-reports', '0 3 * * *', 'SELECT public.cleanup_expired_reports()');

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================

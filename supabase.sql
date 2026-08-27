-- ============================================================
-- THEMIS CLASS — SCHEMA COMPLETO
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SCHOOLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  responsible TEXT,
  plan TEXT DEFAULT 'basic',
  plan_start DATE,
  plan_end DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. PROFILES (users extended)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'professor' CHECK (role IN ('admin', 'gestor', 'professor', 'coordenador')),
  cpf TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  temp_password BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  enrollment TEXT,
  shift TEXT DEFAULT 'morning' CHECK (shift IN ('morning', 'afternoon', 'night')),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. GUARDIANS (responsáveis)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  primary_contact BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. CLASSES (turmas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INT,
  shift TEXT DEFAULT 'morning',
  grade TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. CLASS_STUDENTS (pivot)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  UNIQUE(class_id, student_id)
);

-- ============================================================
-- 7. CLASS_TEACHERS (pivot)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  UNIQUE(class_id, teacher_id)
);

-- ============================================================
-- 8. INCIDENT_TYPES (tipos de ocorrência)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE, -- NULL = padrão da plataforma
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. INCIDENTS (ocorrências)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  class_id UUID REFERENCES public.classes(id),
  incident_type_id UUID REFERENCES public.incident_types(id),
  incident_date TIMESTAMPTZ DEFAULT NOW(),
  location TEXT,
  description TEXT,
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. INCIDENT_STATUS_LOG (histórico de status)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_status_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. COMMUNICATIONS (fila de mensagens)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'whatsapp', 'push', 'portal')),
  recipient_name TEXT,
  recipient_contact TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'error')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. AUDIT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- SCHOOLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can do everything on schools" ON public.schools;
CREATE POLICY "Admin can do everything on schools" ON public.schools
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
DROP POLICY IF EXISTS "Gestor can read own school" ON public.schools;
CREATE POLICY "Gestor can read own school" ON public.schools
  FOR SELECT USING (
    id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  );

-- PROFILES: desabilitar RLS para simplicidade e segurança via app
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- STUDENTS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own school students" ON public.students;
CREATE POLICY "Users access own school students" ON public.students
  USING (
    school_id IN (
      SELECT CASE 
        WHEN role = 'admin' THEN NULL
        ELSE school_id 
      END FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- GUARDIANS
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own school guardians" ON public.guardians;
CREATE POLICY "Users access own school guardians" ON public.guardians
  USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CLASSES
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own school classes" ON public.classes;
CREATE POLICY "Users access own school classes" ON public.classes
  USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CLASS_STUDENTS
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own school class_students" ON public.class_students;
CREATE POLICY "Users access own school class_students" ON public.class_students
  USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CLASS_TEACHERS
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own school class_teachers" ON public.class_teachers;
CREATE POLICY "Users access own school class_teachers" ON public.class_teachers
  USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INCIDENT_TYPES
ALTER TABLE public.incident_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access incident types" ON public.incident_types;
CREATE POLICY "Users access incident types" ON public.incident_types
  USING (
    school_id IS NULL -- tipos padrão da plataforma
    OR school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INCIDENTS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own school incidents" ON public.incidents;
CREATE POLICY "Users access own school incidents" ON public.incidents
  USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INCIDENT_STATUS_LOG
ALTER TABLE public.incident_status_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access incident status log" ON public.incident_status_log;
CREATE POLICY "Users access incident status log" ON public.incident_status_log
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (
        i.school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

-- COMMUNICATIONS
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own school communications" ON public.communications;
CREATE POLICY "Users access own school communications" ON public.communications
  USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- AUDIT_LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own school audit logs" ON public.audit_logs;
CREATE POLICY "Users access own school audit logs" ON public.audit_logs
  USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Tipos padrão da plataforma
INSERT INTO public.incident_types (name, description, is_default, school_id) VALUES
  ('Uso indevido de celular', 'Utilização do celular durante a aula sem autorização.', TRUE, NULL),
  ('Não realização das tarefas', 'Aluno não realizou a atividade ou tarefa solicitada pelo professor.', TRUE, NULL),
  ('Atraso na aula', 'Aluno chegou após o início da aula.', TRUE, NULL),
  ('Conversas excessivas', 'Aluno conversando de forma que prejudica a aprendizagem.', TRUE, NULL),
  ('Falta de participação', 'Aluno com baixo engajamento nas atividades.', TRUE, NULL),
  ('Comportamento inadequado', 'Comportamento fora das normas da escola.', TRUE, NULL),
  ('Desrespeito ao professor', 'Desrespeito ao professor ou funcionário.', TRUE, NULL),
  ('Desrespeito aos colegas', 'Comportamento ofensivo ou agressivo com colegas.', TRUE, NULL),
  ('Saída sem autorização', 'Aluno saiu da sala ou escola sem autorização.', TRUE, NULL),
  ('Falta de material', 'Aluno sem material escolar necessário para a aula.', TRUE, NULL)
ON CONFLICT DO NOTHING;

-- Admin user — insere ou atualiza perfil do admin
INSERT INTO public.profiles (id, role, name, email, school_id)
SELECT 
  id,
  'admin',
  'Administrador',
  email,
  NULL
FROM auth.users
WHERE email = 'vlmat.usp@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', school_id = NULL;

-- Escola de demonstração
INSERT INTO public.schools (id, name, cnpj, email, phone, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Escola Modelo — Demonstração',
  '00.000.000/0001-00',
  'contato@escolamodelo.edu.br',
  '(11) 99999-0000',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================

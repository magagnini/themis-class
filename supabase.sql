-- Habilitar a extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Escolas
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Perfis de Usuários (ADM, Gestor, Professor) integrados ao auth.users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE, -- NULL para ADM da Plataforma
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'gestor', 'professor')),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Alunos
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    class_name VARCHAR(100),
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(20),
    guardian_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tipos de Ocorrência
CREATE TABLE public.incident_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE, -- NULL se for padrão do sistema
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Ocorrências
CREATE TABLE public.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id),
    type_id UUID NOT NULL REFERENCES public.incident_types(id),
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    location VARCHAR(255),
    description TEXT NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('Baixa', 'Média', 'Alta')),
    status VARCHAR(50) DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em acompanhamento', 'Resolvida')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (Row Level Security) para garantir Isolamento por Escola
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas (Exemplo: Professores e Gestores só veem dados da sua escola)
CREATE POLICY "Usuários veem dados da sua própria escola" 
ON public.students 
FOR SELECT 
USING (
    school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Usuários veem ocorrências da sua escola" 
ON public.incidents 
FOR SELECT 
USING (
    school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

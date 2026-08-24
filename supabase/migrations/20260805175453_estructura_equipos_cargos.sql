-- Fase A — estructura organizacional administrable.
-- departamento 1—* equipo (con líder) —* usuarios (equipo_id = única membresía).
-- cargo ortogonal (cargo_id). Departamento se DERIVA del equipo → dropea usuarios.departamento_id.

-- 1. Catálogo de cargos
CREATE TABLE IF NOT EXISTS public.cargos (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Equipos (dentro de un departamento, con un líder)
CREATE TABLE IF NOT EXISTS public.equipos (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  departamento_id uuid NOT NULL REFERENCES public.departamentos(id),
  lider_id uuid REFERENCES public.usuarios(id),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. usuarios: nuevas FK (nullable — persona sin equipo = sin departamento)
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS equipo_id uuid REFERENCES public.equipos(id);
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.cargos(id);

-- 4. RLS: lectura para autenticados (mismo patrón que departamentos); escritura solo service_role (sin policy)
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cargos_select_authenticated" ON public.cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipos_select_authenticated" ON public.equipos FOR SELECT TO authenticated USING (true);

-- 5. Seed de catálogos (idempotente)
INSERT INTO public.departamentos (codigo, nombre, color, icono, activo)
VALUES ('MKT', 'Marketing', '#7C6FF7', '📣', true)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.equipos (codigo, nombre, departamento_id, activo)
SELECT 'MKT-GEN', 'Marketing', d.id, true
FROM public.departamentos d WHERE d.codigo = 'MKT'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.cargos (codigo, nombre) VALUES
  ('DIR_MKT',    'Director de Marketing'),
  ('LEAD_DSG',   'Lead Designer'),
  ('GRAPH_DSG',  'Graphic Designer'),
  ('LEAD_EDIT',  'Lead Editor & Animations'),
  ('VIDEO_EDIT', 'Video Editor'),
  ('FULLSTACK',  'Full Stack Developer'),
  ('EXEC_CM',    'Ejecutiva de Cuentas & CM')
ON CONFLICT (codigo) DO NOTHING;

-- 6. Migración genérica de datos existentes (no-op en dev/local vacío; efectiva en prod)
--    cargo (text) -> cargo_id
UPDATE public.usuarios u SET cargo_id = c.id
FROM public.cargos c
WHERE u.cargo_id IS NULL AND u.cargo IS NOT NULL AND c.nombre = u.cargo;
--    quien estaba en departamento Marketing -> equipo Marketing
UPDATE public.usuarios u SET equipo_id = e.id
FROM public.equipos e
JOIN public.departamentos d ON d.id = e.departamento_id
WHERE u.equipo_id IS NULL AND d.codigo = 'MKT' AND u.departamento_id = d.id;

-- 7. Drop de columnas redundantes (departamento derivado del equipo; cargo migrado a cargo_id)
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS departamento_id;
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS cargo;

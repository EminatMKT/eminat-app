-- Jornada y vinculación: dos ejes que hoy viven colapsados en `usuarios.tipo`.
--
-- `usuarios.tipo` guardaba 'A'/'B' y la UI los rotulaba "Tipo A — Staff" /
-- "Tipo B — Pasante". El rótulo describía una dimensión (el vínculo) y el valor
-- representaba otra (la carga horaria). Son ortogonales: alguien puede ser staff
-- a medio tiempo o pasante a tiempo completo, y con un solo campo eso no se
-- puede expresar.
--
-- Quedan como dos catálogos separados, mismo patrón que los otros cuatro:
--   jornadas      → carga horaria, con horas_dia (dato que hoy no existía en
--                   ningún lado: el cálculo de horas de Stratix es fijo)
--   vinculaciones → tipo de relación laboral, sin atributos extra
--
-- El backfill solo puede reconstruir la JORNADA (de ahí venían A/B). La
-- vinculación arranca vacía: esa información nunca estuvo en la base, solo en
-- el rótulo equivocado, así que no hay de dónde deducirla.

CREATE TABLE IF NOT EXISTS public.jornadas (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  horas_dia numeric(4,2) NOT NULL DEFAULT 8,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vinculaciones (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS: lectura para autenticados; escritura solo service_role (sin policy),
-- igual que el resto de los catálogos.
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vinculaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jornadas_select_authenticated" ON public.jornadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "vinculaciones_select_authenticated" ON public.vinculaciones FOR SELECT TO authenticated USING (true);

INSERT INTO public.jornadas (codigo, nombre, horas_dia) VALUES
  ('COMPLETA', 'Jornada completa', 8),
  ('MEDIA',    'Media jornada',    4)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.vinculaciones (codigo, nombre) VALUES
  ('STAFF',   'Staff'),
  ('PASANTE', 'Pasante')
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS jornada_id     uuid REFERENCES public.jornadas(id);
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS vinculacion_id uuid REFERENCES public.vinculaciones(id);

-- Backfill de la jornada: 'A' era completa y 'B' media.
UPDATE public.usuarios u SET jornada_id = j.id
FROM public.jornadas j
WHERE u.jornada_id IS NULL AND (
  (u.tipo = 'A' AND j.codigo = 'COMPLETA') OR
  (u.tipo = 'B' AND j.codigo = 'MEDIA')
);

ALTER TABLE public.usuarios DROP COLUMN IF EXISTS tipo;

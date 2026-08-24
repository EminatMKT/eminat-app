-- Fase A.2 (paso 1) — cargos pasa de N:1 (usuarios.cargo_id) a N:N (tabla puente).
-- Split de los cargos con "&" del catálogo en entradas granulares (trazabilidad):
--   "Lead Editor & Animations"     -> "Lead Editor" + "Animations"
--   "Ejecutiva de Cuentas & CM"    -> "Ejecutiva de Cuentas" + "CM"
-- Se corre ANTES del CRUD de A.2 para no construirlo dos veces.

-- 1. Tabla puente usuario_cargos (PK compuesta; borra en cascada al eliminar usuario/cargo)
CREATE TABLE IF NOT EXISTS public.usuario_cargos (
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cargo_id   uuid NOT NULL REFERENCES public.cargos(id)   ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (usuario_id, cargo_id)
);

-- 2. RLS: lectura autenticados; escritura solo service_role (sin policy) — mismo patrón que cargos/equipos
ALTER TABLE public.usuario_cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_cargos_select_authenticated"
  ON public.usuario_cargos FOR SELECT TO authenticated USING (true);

-- 3. Migrar el cargo único actual (usuarios.cargo_id) a filas del puente
INSERT INTO public.usuario_cargos (usuario_id, cargo_id)
SELECT u.id, u.cargo_id FROM public.usuarios u WHERE u.cargo_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Split de los cargos con "&": renombrar la entrada existente a su primera parte
--    (los refs del puente que la apuntan quedan correctos) y agregar la segunda parte.
UPDATE public.cargos SET nombre = 'Lead Editor'          WHERE codigo = 'LEAD_EDIT';
UPDATE public.cargos SET codigo = 'EXEC_CUENTAS', nombre = 'Ejecutiva de Cuentas' WHERE codigo = 'EXEC_CM';

INSERT INTO public.cargos (codigo, nombre) VALUES
  ('ANIM', 'Animations'),
  ('CM',   'CM')
ON CONFLICT (codigo) DO NOTHING;

-- 5. Asignar la segunda parte a quien tuviera el cargo combinado (data-driven, sin nombres hardcodeados)
INSERT INTO public.usuario_cargos (usuario_id, cargo_id)
SELECT uc.usuario_id, (SELECT id FROM public.cargos WHERE codigo = 'ANIM')
FROM public.usuario_cargos uc JOIN public.cargos c ON c.id = uc.cargo_id
WHERE c.codigo = 'LEAD_EDIT'
ON CONFLICT DO NOTHING;

INSERT INTO public.usuario_cargos (usuario_id, cargo_id)
SELECT uc.usuario_id, (SELECT id FROM public.cargos WHERE codigo = 'CM')
FROM public.usuario_cargos uc JOIN public.cargos c ON c.id = uc.cargo_id
WHERE c.codigo = 'EXEC_CUENTAS'
ON CONFLICT DO NOTHING;

-- 6. Drop de la FK única (ya migrada al puente)
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS cargo_id;

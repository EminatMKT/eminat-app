-- Empresas: de lista hardcodeada en el front a catálogo administrable, mismo
-- tratamiento que cargos/equipos/departamentos.
--
-- Estado previo: la tabla `empresas` ya existía (migración empresa_rename_eje_unico)
-- con las 7 marcas a las que se ATRIBUYEN actividades, pero:
--   · sin policy de SELECT → el cliente no podía leerla (devolvía 0 filas);
--   · sin UNIQUE en codigo → el CRUD no podía detectar duplicados;
--   · las empresas de PERTENENCIA (a cuál pertenece una persona) no estaban:
--     vivían hardcodeadas en shared/constants/companies.ts y usuarios.empresa
--     guardaba el nombre largo como texto libre ('Eminat Holding').
-- Decisión vigente (2026-08-04): UNA sola lista de empresas con dos relaciones
-- distintas — pertenencia (usuarios) y atribución (actividades). Esta migración
-- unifica la lista y convierte la pertenencia en FK.

-- 1. Lectura para autenticados (mismo patrón que los otros catálogos)
CREATE POLICY "empresas_select_authenticated" ON public.empresas FOR SELECT TO authenticated USING (true);

-- 2. codigo único (lo asume el CRUD genérico de /api/admin/org)
ALTER TABLE public.empresas ADD CONSTRAINT empresas_codigo_key UNIQUE (codigo);

-- 3. Sembrar las empresas que solo existían en el front, para no perder ninguna
--    opción que el admin ya veía en el dropdown. Ahora son editables/borrables
--    desde el panel, así que depurar la lista es una decisión de negocio, no un deploy.
INSERT INTO public.empresas (codigo, nombre, color) VALUES
  ('EMINAT',  'Eminat Group',           '#7C6FF7'),
  ('STRATIX', 'Stratix Communications', '#4F46E5'),
  ('ONDARA',  'Ondara Media',           '#06B6D4'),
  ('DACOACH', 'DaCoach IS',             '#A78BFA')
ON CONFLICT (codigo) DO NOTHING;

-- 4. Pertenencia como FK (consistente con actividades/slots/solicitudes.empresa_id
--    y con usuarios.equipo_id). Nullable: una persona puede no tener empresa asignada.
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

-- 5. Backfill del texto libre → FK. El mapeo cubre los nombres canónicos de
--    companies.ts y los alias legacy que quedaron en filas viejas.
UPDATE public.usuarios u SET empresa_id = e.id
FROM public.empresas e
JOIN (VALUES
  ('Eminat Group',                  'EMINAT'),
  ('Eminat Holding',                'EMINAT'),   -- legacy
  ('Stratix Communications',        'STRATIX'),
  ('EMC (Eminat Medical Center)',   'EMC'),
  ('Eminat Medical Center',         'EMC'),      -- legacy
  ('Eminat Research Group (ERG)',   'ERG'),
  ('Eminat Research Group',         'ERG'),      -- legacy
  ('Soy Vivi Negrete (SVN)',        'SVN'),
  ('Soy Vivi Negrete',              'SVN'),      -- legacy
  ('Vivi Negrete Foundation (VNF)', 'VNF'),
  ('Vivi Negrete Foundation',       'VNF'),      -- legacy
  ('Premier by Eminat',             'PREMIER'),
  ('Eminat Mentor',                 'MENTOR'),
  ('Ondara Media',                  'ONDARA'),
  ('DaCoach IS',                    'DACOACH')
) AS m(nombre_legacy, codigo) ON m.codigo = e.codigo
WHERE u.empresa_id IS NULL AND u.empresa = m.nombre_legacy;

-- 6. Drop del texto libre: la fuente de verdad pasa a ser la FK.
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS empresa;

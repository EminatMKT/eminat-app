-- empresa como eje único: rename de esquema + seed de empresas.
-- Ver docs/superpowers/plans/2026-08-04-empresa-eje-unico-migracion.md
-- Idempotente en lo posible; los RENAME fallan si ya se aplicaron (correcto: no re-aplicar).

-- 1) Renombrar la tabla areas -> empresas.
ALTER TABLE public.areas RENAME TO empresas;

-- 2) Renombrar las columnas FK uuid (area_id -> empresa_id). Sin call-sites en código.
ALTER TABLE public.actividades      RENAME COLUMN area_id TO empresa_id;
ALTER TABLE public.slots_calendario RENAME COLUMN area_id TO empresa_id;
ALTER TABLE public.solicitudes      RENAME COLUMN area_id TO empresa_id;

-- 3) Renombrar la columna de código legible que usa la app (area_ref -> empresa).
ALTER TABLE public.actividades RENAME COLUMN area_ref TO empresa;

-- 4) Seed idempotente de empresas desde MARCAS_LIST (shared/constants/domain.ts).
--    nombre = label; color = color de MARCAS_LIST.
INSERT INTO public.empresas (codigo, nombre, color, activo) VALUES
  ('EMC',     'Medical Center',    '#60A5FA', true),
  ('SVN',     'Soy Vivi Negrete',  '#F472B6', true),
  ('ERG',     'Research Group',    '#A78BFA', true),
  ('VNF',     'VN Foundation',     '#FB923C', true),
  ('PREMIER', 'Premier',           '#34D399', true),
  ('ORNELLA', 'Ornella IA',        '#F87171', true),
  ('MENTOR',  'Eminat Mentor',     '#FBB040', true)
ON CONFLICT (codigo) DO NOTHING;

-- Nota: índices/constraints heredan el nombre viejo (areas_pkey, areas_codigo_key,
-- actividades_area_id_fkey). Renombrarlos es cosmético y se difiere.
-- NO se agrega FK en usuarios.empresa ni en actividades.empresa (ver Task 4).

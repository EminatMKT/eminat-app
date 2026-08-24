-- `telefono_alt` era el parche para "una persona tiene dos números", que ahora modela
-- `paciente_contactos`. Ver el spec 2026-08-23-contactos-multivaluados-design.md.
-- IF EXISTS para que el .sql se pueda aplicar dos veces por psql, como el resto.
ALTER TABLE public.pacientes DROP COLUMN IF EXISTS telefono_alt;

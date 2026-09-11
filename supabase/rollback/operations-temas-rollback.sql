-- Rollback de 20260911130100_temas_catalogo.sql.
--
-- Devuelve `reunion_temas` a su forma de una-fila-un-título y borra todo lo que la migración
-- creó. Es trivial porque la tabla estaba vacía: si esto se corre con filas cargadas, los
-- títulos que quedan son los de `temas` y hay que copiarlos a mano ANTES (el UPDATE de abajo).
BEGIN;

-- ⚠️ EL ORDEN NO ES LIBRE, Y HAY UNA DEPENDENCIA CIRCULAR. Las policies `temas_select` y
--    `temas_update` leen `reunion_temas.tema_id`, y `reunion_temas.tema_id` tiene una FK a
--    `temas`. Así que `DROP TABLE temas` primero falla por la FK, y `DROP COLUMN tema_id`
--    primero falla por las policies — las dos cosas probadas contra el Postgres local. El corte
--    es dropear las POLICIES antes que nada: eso rompe el lado que no es de esquema.

-- 1. Recuperar el texto antes de romper el vínculo. Con 0 filas no hace nada; con filas, es lo
--    único que evita perder los títulos.
ALTER TABLE public.reunion_temas ADD COLUMN IF NOT EXISTS titulo text;
UPDATE public.reunion_temas rt SET titulo = t.titulo
  FROM public.temas t WHERE t.id = rt.tema_id AND rt.titulo IS NULL;
UPDATE public.reunion_temas SET titulo = '(sin título)' WHERE titulo IS NULL;
ALTER TABLE public.reunion_temas ALTER COLUMN titulo SET NOT NULL;

-- 2. Las policies de `temas`, que son las que dependen de la columna. Van primero.
DROP POLICY IF EXISTS temas_select ON public.temas;
DROP POLICY IF EXISTS temas_insert ON public.temas;
DROP POLICY IF EXISTS temas_update ON public.temas;

-- 3. Los triggers de auditoría que agregó la migración, y la función de alta. `log_reunion()` NO
--    se toca: la migración tampoco la tocó.
DROP TRIGGER IF EXISTS trg_log ON public.reunion_temas;
DROP TRIGGER IF EXISTS trg_log ON public.temas;
DROP FUNCTION IF EXISTS public.tema_para_acta(uuid, text);

-- 4. La columna (que se lleva su FK), y recién después la tabla.
ALTER TABLE public.reunion_temas DROP CONSTRAINT IF EXISTS reunion_temas_unicos;
DROP INDEX IF EXISTS public.reunion_temas_tema_id_idx;
ALTER TABLE public.reunion_temas DROP COLUMN IF EXISTS tema_id;
DROP TABLE IF EXISTS public.temas;

-- 5. La policy de `reunion_temas`, exactamente como la dejó 20260829221511. Va DESPUÉS de la
--    tabla: mientras la nueva versión exista, sigue referenciando `puedo_ver_reunion`.
DROP POLICY IF EXISTS reunion_temas_select ON public.reunion_temas;
CREATE POLICY reunion_temas_select ON public.reunion_temas FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.reuniones r WHERE r.id = reunion_temas.reunion_id));

DROP FUNCTION IF EXISTS public.puedo_ver_reunion(uuid);

COMMIT;

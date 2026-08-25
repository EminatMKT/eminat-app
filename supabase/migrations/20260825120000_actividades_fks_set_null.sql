-- Borrar una tarea referenciada por notificaciones, slots_calendario o solicitudes fallaba con
-- FK violation (las tres FKs eran NO ACTION). Las tres columnas son nullable y el link no tiene
-- sentido sin la tarea: SET NULL desvincula en vez de bloquear.
--
-- Se escribe defensiva a propósito, porque corre contra una base de producción que nadie de
-- este lado vio. Tres cosas que la primera versión daba por sentadas y acá se verifican:
--
--   1. El NOMBRE de cada constraint. Estaba escrito a mano (`notificaciones_actividad_id_fkey`).
--      Postgres nombra solo las constraints anónimas y no promete ese nombre; si prod tiene otro
--      —porque la tabla nació de un dump, de un rename o de una creación distinta— el DROP
--      aborta. Acá el nombre se BUSCA por lo que la constraint hace (FK de actividad_id hacia
--      actividades), no por cómo se llama.
--   2. Las FILAS HUÉRFANAS. `ADD CONSTRAINT` valida todas las filas existentes: si alguna
--      apunta a una actividad que ya no está, falla a mitad de la migración. Se cuentan ANTES
--      de tocar nada y se aborta con un mensaje que dice cuántas y dónde.
--   3. Que la tabla y la columna EXISTAN. Si un módulo todavía no llegó a prod, la migración
--      dice cuál falta en vez de reventar con un error de Postgres sin contexto.
--
-- Todo va en un solo DO: si algo falla, no queda ninguna FK dropeada sin recrear.

DO $$
DECLARE
  tablas   text[] := ARRAY['notificaciones', 'slots_calendario', 'solicitudes'];
  tbl      text;
  cons     text;
  huerfano bigint;
  total    bigint := 0;
  detalle  text := '';
BEGIN
  -- Paso 1: nada existe a medias. Se verifica todo antes de modificar nada.
  FOREACH tbl IN ARRAY tablas LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      RAISE EXCEPTION 'La tabla public.% no existe en esta base', tbl;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'actividad_id'
    ) THEN
      RAISE EXCEPTION 'public.% no tiene columna actividad_id', tbl;
    END IF;

    EXECUTE format(
      'SELECT count(*) FROM public.%I t WHERE t.actividad_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM public.actividades a WHERE a.id = t.actividad_id)', tbl
    ) INTO huerfano;

    IF huerfano > 0 THEN
      total := total + huerfano;
      detalle := detalle || format('%s: %s  ', tbl, huerfano);
    END IF;
  END LOOP;

  IF total > 0 THEN
    RAISE EXCEPTION E'Hay % fila(s) con actividad_id apuntando a una actividad inexistente (%).\n'
      'La FK no se puede recrear hasta limpiarlas. Para verlas:\n'
      '  SELECT * FROM notificaciones t WHERE t.actividad_id IS NOT NULL\n'
      '    AND NOT EXISTS (SELECT 1 FROM actividades a WHERE a.id = t.actividad_id);\n'
      'Y para desvincularlas (es lo que la FK nueva haría igual al borrar la tarea):\n'
      '  UPDATE notificaciones t SET actividad_id = NULL WHERE ...misma condición...;',
      total, detalle;
  END IF;

  -- Paso 2: recrear cada FK con ON DELETE SET NULL, buscando su nombre real.
  FOREACH tbl IN ARRAY tablas LOOP
    SELECT c.conname INTO cons
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.conrelid = ('public.' || tbl)::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.actividades'::regclass
      AND a.attname = 'actividad_id'
      AND array_length(c.conkey, 1) = 1;

    IF cons IS NULL THEN
      RAISE EXCEPTION 'public.% no tiene una FK de actividad_id hacia actividades', tbl;
    END IF;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl, cons);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (actividad_id)
         REFERENCES public.actividades(id) ON DELETE SET NULL', tbl, cons
    );
    RAISE NOTICE 'public.%.% → ON DELETE SET NULL', tbl, cons;
  END LOOP;
END $$;

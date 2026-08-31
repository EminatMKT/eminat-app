-- Cuándo empieza el trabajo de una actividad, y con eso a qué mes se imputa en el reporte de pago.
--
-- `mes` era `text` y guardaba 'Agosto' — el mes sin el año. El reporte de pago filtra con
-- `mes = 'Agosto'` y por lo tanto suma ese mes de TODOS los años. Hoy casi no se nota porque hay
-- una sola temporada cargada; en enero de 2027 el reporte de Enero incluiría enero de 2026 y se
-- leería como que la persona trabajó el doble, no como un error. Sale impreso en un pago.
--
-- Esta migración NO BORRA NADA. Agrega `fecha_inicio` y deja `mes`, `trimestre`, `semana` y
-- `sheet_row` donde están, como testigos: el backfill se verifica en producción comparando
-- contra ellas, sobre datos reales. El drop va en una segunda migración, después.
--
-- Diseño: docs/superpowers/specs/2026-08-31-fecha-inicio-design.md

-- 1. Los años tipeados mal.
--
-- Doce filas tienen fechas como '0206-03-23': un 2026 al que se le perdió un dígito al cargarlo
-- desde el Google Sheet. Se corrigen EN las columnas de fecha y no sólo al calcular
-- `fecha_inicio`, porque mientras el typo esté el Gantt dibuja esas barras en el año 206 — es el
-- bug que documenta `updateFecha` en src/shared/data/actividades.ts.
UPDATE public.actividades
   SET fecha_requerida = make_date(2026,
         EXTRACT(MONTH FROM fecha_requerida)::int,
         EXTRACT(DAY   FROM fecha_requerida)::int)
 WHERE fecha_requerida IS NOT NULL
   AND EXTRACT(YEAR FROM fecha_requerida) < 1900;

UPDATE public.actividades
   SET fecha_entrega = make_date(2026,
         EXTRACT(MONTH FROM fecha_entrega)::int,
         EXTRACT(DAY   FROM fecha_entrega)::int)
 WHERE fecha_entrega IS NOT NULL
   AND EXTRACT(YEAR FROM fecha_entrega) < 1900;

-- 2. La columna.
ALTER TABLE public.actividades ADD COLUMN IF NOT EXISTS fecha_inicio date;

COMMENT ON COLUMN public.actividades.fecha_inicio IS
  'Cuándo empieza el trabajo de la tarea. Su MES es el período de imputación del reporte de pago, '
  'y de ahí salen también el trimestre y los filtros. Reemplaza a `mes` (text, sin año). '
  'Las filas migradas del Google Sheet llevan el día 1 como marcador: el Sheet declaraba el mes, '
  'no el día. NO es `created_at`, que sigue siendo la marca de auditoría de cuándo entró la fila.';

-- 3. El backfill. Una sola regla para las 329 filas: el día 1 del mes que declaraba `mes`, con el
--    año sacado de `fecha_requerida`, si no de `fecha_entrega`, y si ninguna sirve, 2026.
--
--    · El MES sale de `mes` y no de otra fecha: es el dato imputado y es autoritativo. Unas 16
--      filas tienen `fecha_requerida` en un mes distinto del que declaraban (una del 27 de febrero
--      imputada a Marzo); usarla las movería de mes de pago y cambiaría cifras ya vistas.
--    · El DÍA es 1 porque el Sheet nunca dijo un día. De acá en adelante la columna guarda el día
--      real: lo pone el DEFAULT.
--    · 2026 no es inventar: es el único año que existe en toda la tabla.
--
--    No se usa `created_at` como fuente: las 251 filas migradas lo tienen en abril de 2026, que es
--    cuándo corrió la migración del Sheet y no cuándo se hizo el trabajo. De ellas, 238 están
--    imputadas a enero, febrero o marzo.
UPDATE public.actividades a
   SET fecha_inicio = make_date(
         CASE
           WHEN EXTRACT(YEAR FROM a.fecha_requerida) >= 1900 THEN EXTRACT(YEAR FROM a.fecha_requerida)::int
           WHEN EXTRACT(YEAR FROM a.fecha_entrega)   >= 1900 THEN EXTRACT(YEAR FROM a.fecha_entrega)::int
           ELSE 2026
         END,
         array_position(
           ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
           a.mes)::int,
         1)
 WHERE a.mes IS NOT NULL;

-- Las que no tienen `mes` (ninguna en producción hoy, pero la columna lo permite) caen al primer
-- día del mes de su created_at: sin `mes` no hay período imputado que respetar.
UPDATE public.actividades
   SET fecha_inicio = date_trunc('month', created_at)::date
 WHERE fecha_inicio IS NULL;

-- 4. El guard. Si el backfill dejó una sola fila con el mes distinto del que declaraba `mes`, la
--    migración aborta y no se aplica nada: es preferible a un período mal imputado que después
--    sale impreso en un pago.
DO $$
DECLARE desviadas int;
BEGIN
  SELECT count(*) INTO desviadas
    FROM public.actividades
   WHERE mes IS NOT NULL
     AND EXTRACT(MONTH FROM fecha_inicio)::int <> array_position(
           ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'], mes)::int;
  IF desviadas > 0 THEN
    RAISE EXCEPTION 'backfill de fecha_inicio: % filas con el mes distinto de `mes`', desviadas;
  END IF;

  SELECT count(*) INTO desviadas FROM public.actividades WHERE fecha_inicio IS NULL;
  IF desviadas > 0 THEN
    RAISE EXCEPTION 'backfill de fecha_inicio: % filas quedaron sin fecha', desviadas;
  END IF;
END $$;

-- 5. Ahora que todas tienen valor, el default y el NOT NULL.
ALTER TABLE public.actividades
  ALTER COLUMN fecha_inicio SET DEFAULT CURRENT_DATE,
  ALTER COLUMN fecha_inicio SET NOT NULL;

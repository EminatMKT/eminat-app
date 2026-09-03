-- PRECHECK de 20260831220806_actividades_fecha_inicio.sql
--
-- SOLO LECTURA. No modifica nada: se corre contra prod ANTES del `db push`, que es lo que pide
-- la regla «Antes de un `db push` a prod: backup y precheck, en ese orden». Desde que se eliminó
-- el proyecto dev esta consulta es el único ensayo que existe.
--
--   psql "$PROD_DB_URL" -f supabase/prechecks/20260831220806_actividades_fecha_inicio.sql
--
-- Qué contesta, en orden de lo que puede salir mal:
--   1. ¿La migración ya está aplicada?          → si `fecha_inicio` existe, no hay nada que hacer
--   2. ¿Hay un `mes` fuera de las 12 etiquetas? → EL BLOQUEANTE, y es SILENCIOSO. Ver abajo
--   3. ¿Cuántas filas caen al fallback?         → sin `mes`, el período sale de `created_at`
--   4. ¿Alguna fila quedaría sin fecha?         → el guard aborta la migración, limpio pero tarde
--   5. ¿Cuántos años tipeados mal se corrigen?  → los '0206-03-23' del Google Sheet
--   6. ¿Cuántas filas cambian de mes de pago?   → informativo: la migración decide a favor de `mes`
--   7. ¿Cuántas filas tiene la tabla?           → cuánto dura el lock del ALTER

\echo '=== 1. ¿Ya está aplicada? ==='
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public'
                         AND table_name   = 'actividades'
                         AND column_name  = 'fecha_inicio')
         THEN '✗ YA EXISTE fecha_inicio — la migración ya corrió, no la vuelvas a pushear'
         ELSE '✓ no existe todavía — se puede aplicar'
       END AS estado;

\echo ''
\echo '=== 2. BLOQUEANTE: valores de `mes` que el backfill no sabe traducir ==='
\echo '    Tiene que dar CERO filas. Si sale alguna, PARÁ y corregí el dato antes del push.'
\echo '    Por qué es silencioso: array_position() devuelve NULL para una etiqueta que no está en'
\echo '    la lista, make_date(año, NULL, 1) devuelve NULL, y la fila cae al fallback de'
\echo '    created_at. El guard de la migración compara con `<>`, y `algo <> NULL` es NULL, no'
\echo '    TRUE — así que NO la cuenta y la migración pasa en verde con el mes mal imputado.'
SELECT a.mes                     AS mes_no_reconocido,
       count(*)                  AS filas,
       min(a.created_at)::date   AS desde,
       max(a.created_at)::date   AS hasta
  FROM public.actividades a
 WHERE a.mes IS NOT NULL
   AND array_position(
         ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
         a.mes) IS NULL
 GROUP BY a.mes
 ORDER BY filas DESC;

\echo ''
\echo '=== 2b. Repartición de `mes` tal como está hoy (para contrastar después del push) ==='
SELECT COALESCE(mes, '(sin mes)') AS mes, count(*) AS filas
  FROM public.actividades
 GROUP BY mes
 ORDER BY array_position(
            ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'], mes)
          NULLS LAST;

\echo ''
\echo '=== 3. Filas sin `mes`: el período va a salir del mes de su created_at ==='
SELECT count(*) AS sin_mes,
       count(*) FILTER (WHERE created_at IS NOT NULL) AS con_created_at
  FROM public.actividades
 WHERE mes IS NULL;

\echo ''
\echo '=== 4. Filas que quedarían SIN fecha_inicio → la migración aborta (tiene que dar 0) ==='
SELECT count(*) AS quedarian_null
  FROM public.actividades
 WHERE mes IS NULL AND created_at IS NULL;

\echo ''
\echo '=== 5. Años tipeados mal que la migración corrige a 2026 ==='
SELECT count(*) FILTER (WHERE fecha_requerida IS NOT NULL
                          AND EXTRACT(YEAR FROM fecha_requerida) < 1900) AS requerida_typo,
       count(*) FILTER (WHERE fecha_entrega IS NOT NULL
                          AND EXTRACT(YEAR FROM fecha_entrega) < 1900)   AS entrega_typo
  FROM public.actividades;

\echo ''
\echo '=== 6. Informativo: filas cuya fecha_requerida cae en un mes distinto del imputado ==='
\echo '    No bloquea. La migración decide a favor de `mes` a propósito: mover estas de mes'
\echo '    cambiaría cifras de pago ya vistas. El número esperado ronda 16.'
SELECT count(*) AS discrepan
  FROM public.actividades a
 WHERE a.mes IS NOT NULL
   AND a.fecha_requerida IS NOT NULL
   AND EXTRACT(YEAR FROM a.fecha_requerida) >= 1900
   AND EXTRACT(MONTH FROM a.fecha_requerida)::int IS DISTINCT FROM array_position(
         ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
         a.mes)::int;

\echo ''
\echo '=== 7. Tamaño de la tabla ==='
SELECT count(*) AS filas FROM public.actividades;

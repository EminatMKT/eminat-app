-- PRECHECK de 20260825120000_actividades_fks_set_null.sql
--
-- SOLO LECTURA. No modifica nada: se corre contra dev y contra prod ANTES del `db push`, que es
-- lo que pide rules/base-de-datos.md (backup y precheck, en ese orden).
--
--   psql "$PROD_DB_URL" -f supabase/prechecks/20260825120000_actividades_fks_set_null.sql
--
-- Qué contesta, en orden de lo que puede salir mal:
--   1. ¿Existen las tres tablas y su columna?      → si falta una, la migración aborta con nombre
--   2. ¿Cómo se llama HOY cada constraint?          → si el nombre difiere, no importa: la
--                                                     migración lo busca, pero conviene verlo
--   3. ¿Cuál es su ON DELETE actual?                → 'a' = NO ACTION (lo que se viene a cambiar),
--                                                     'n' = SET NULL (ya aplicada, nada que hacer)
--   4. ¿Hay filas huérfanas?                        → EL BLOQUEANTE. Con una sola, aborta.
--   5. ¿Cuántas filas tiene cada tabla?             → cuánto dura el lock del ALTER

\echo '=== 1 y 2. Tablas, columna y nombre real de cada FK ==='
SELECT
  t.tabla,
  CASE WHEN to_regclass('public.' || t.tabla) IS NULL THEN '✗ NO EXISTE' ELSE '✓' END AS tabla_ok,
  COALESCE(c.conname, '✗ SIN FK hacia actividades')                                   AS constraint_actual,
  CASE c.confdeltype
    WHEN 'a' THEN 'NO ACTION  → hay que migrarla'
    WHEN 'n' THEN 'SET NULL   → ya está aplicada'
    WHEN 'c' THEN 'CASCADE    → ¡ojo! borraría filas'
    ELSE COALESCE(c.confdeltype::text, '—')
  END                                                                                  AS on_delete_actual
FROM (VALUES ('notificaciones'), ('slots_calendario'), ('solicitudes')) AS t(tabla)
LEFT JOIN pg_constraint c
  ON c.conrelid = to_regclass('public.' || t.tabla)
 AND c.contype = 'f'
 AND c.confrelid = 'public.actividades'::regclass
 AND array_length(c.conkey, 1) = 1
 AND (SELECT attname FROM pg_attribute WHERE attrelid = c.conrelid AND attnum = c.conkey[1]) = 'actividad_id'
ORDER BY t.tabla;

\echo ''
\echo '=== 3. BLOQUEANTE: filas con actividad_id apuntando a una actividad que ya no existe ==='
\echo '     Cualquier número > 0 aborta la migración. Hay que ponerlas en NULL antes.'
SELECT 'notificaciones'   AS tabla, count(*) AS huerfanas FROM notificaciones t
  WHERE t.actividad_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actividades a WHERE a.id = t.actividad_id)
UNION ALL
SELECT 'slots_calendario', count(*) FROM slots_calendario t
  WHERE t.actividad_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actividades a WHERE a.id = t.actividad_id)
UNION ALL
SELECT 'solicitudes', count(*) FROM solicitudes t
  WHERE t.actividad_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actividades a WHERE a.id = t.actividad_id);

\echo ''
\echo '=== 4. Volumen: el ALTER toma un lock y escanea la tabla para validar la FK ==='
\echo '     Hasta unos cientos de miles de filas es instantáneo. Muy por encima, conviene'
\echo '     hacerlo en una ventana de poco tráfico.'
SELECT relname AS tabla, n_live_tup AS filas_aprox
FROM pg_stat_user_tables
WHERE relname IN ('actividades', 'notificaciones', 'slots_calendario', 'solicitudes')
ORDER BY relname;

\echo ''
\echo '=== 5. Cuántas filas quedarían desvinculadas si mañana se borra una tarea ==='
\echo '     No es un riesgo de la migración: es lo que la migración HABILITA. Sirve para saber'
\echo '     de qué tamaño es el efecto antes de que alguien apriete Borrar.'
SELECT 'notificaciones' AS tabla, count(*) AS con_actividad FROM notificaciones WHERE actividad_id IS NOT NULL
UNION ALL SELECT 'slots_calendario', count(*) FROM slots_calendario WHERE actividad_id IS NOT NULL
UNION ALL SELECT 'solicitudes', count(*) FROM solicitudes WHERE actividad_id IS NOT NULL;

-- PRECHECK de 20260903223849_actividades_created_by.sql
--
-- SOLO LECTURA. Se corre contra prod ANTES del `db push`, que es lo que pide
-- rules/base-de-datos.md (backup y precheck, en ese orden).
--
--   pnpm supabase db query --linked -o table \
--     -f supabase/prechecks/20260903223849_actividades_created_by.sql
--
-- SIN `\echo` ni `\d`, a propósito: son metacomandos de `psql`, y a prod NO se entra por psql.
-- El `pg_dump`/`psql` del host es v14 contra un servidor 17, y `.env.prod` no tiene ninguna
-- `PROD_DB_URL` — sólo las claves del cliente. La única puerta es `supabase db query --linked`,
-- que va por la Management API con el proyecto ya linkeado. Un precheck que sólo corre en local
-- no es un precheck.
--
-- Esta migración es de las mansas: un ADD COLUMN nullable y sin default es metadato en PG11+,
-- no reescribe la tabla y no puede abortar por datos. Lo que se busca no es el dato, son las
-- tres formas en que igual puede salir mal:
--
--   1. La columna YA existe con otra forma  → `IF NOT EXISTS` la saltea EN SILENCIO y prod queda
--                                             distinta de local, para siempre y sin aviso.
--   2. `usuarios` o su PK no están          → la FK aborta.
--   3. Hay OTRAS migraciones pendientes     → `db push` aplica todas las que falten, no sólo
--                                             ésta. Eso no es SQL: `supabase migration list`.
--
-- Cómo se lee el resultado:
--   columna_ya_existe  = 0     → bien. Cualquier otro número: mirarla antes de pushear.
--   usuarios_id_es_pk  = si    → bien.
--   filas_actividades  = <n>   → anotarlo: la verificación posterior al push tiene que dar lo
--                                mismo, y `con_creador` tiene que dar 0.

SELECT 'columna_ya_existe' AS chequeo, count(*)::text AS valor
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'actividades' AND column_name = 'created_by_id'
UNION ALL
SELECT 'usuarios_id_es_pk', CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = to_regclass('public.usuarios') AND contype IN ('p', 'u')
       AND array_length(conkey, 1) = 1
       AND (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = conkey[1]) = 'id'
  ) THEN 'si' ELSE 'NO — la FK aborta' END
UNION ALL
SELECT 'filas_actividades', count(*)::text FROM public.actividades;

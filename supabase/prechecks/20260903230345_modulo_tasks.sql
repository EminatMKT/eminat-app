-- PRECHECK de las DOS migraciones del módulo `tasks`:
--   20260903230345_modulo_tasks_role_modules.sql
--   20260903235201_actividades_policy_tasks.sql
--
-- SOLO LECTURA. Se corre contra prod ANTES del `db push`, después del backup — que acá son dos
-- piezas, porque las migraciones tocan datos Y esquema:
--   · supabase/rollback/predump-modulo-tasks-20260903.sql          (las filas)
--   · supabase/rollback/policies-actividades-antes-de-tasks-*.sql  (las policies)
--
--   pnpm supabase db query --linked -o table \
--     -f supabase/prechecks/20260903230345_modulo_tasks.sql
--
-- SIN `\echo` ni `\d`: son metacomandos de `psql`, y a prod no se entra por psql — el pg_dump
-- del host es v14 contra un servidor 17 y `.env.prod` no tiene ninguna PROD_DB_URL. La única
-- puerta es `supabase db query --linked`.
--
-- Ninguna de las dos migraciones puede abortar por datos: una inserta con ON CONFLICT DO NOTHING
-- y la otra reemplaza policies. Lo que se busca es lo OTRO — las cuatro formas en que igual
-- salen mal, todas silenciosas:
--
--   1. `stratix-mkt` no existe en role_modules  → la migración aborta con su RAISE EXCEPTION
--                                                 (bien), pero mejor saberlo antes.
--   2. `tasks` YA existe con otras filas        → el INSERT las saltea y prod queda con un
--                                                 conjunto de roles distinto del esperado.
--   3. Las policies se llaman distinto en prod  → el DROP IF EXISTS no encuentra nada, se crean
--                                                 las nuevas y quedan DOS policies de SELECT
--                                                 conviviendo. No falla: Postgres las combina
--                                                 con OR y nadie se entera.
--   4. Alguien tiene stratix-mkt y no quedaría  → imposible por construcción (el INSERT copia de
--      con tasks                                  ahí), pero es la afirmación que sostiene todo
--                                                 el despliegue: se verifica, no se asume.

-- 1 · ¿Existe el slug del que se copia? Tiene que dar > 0.
select 'roles con stratix-mkt (debe ser > 0)' as verificacion,
       count(*)::text as valor
  from public.role_modules where module_slug = 'stratix-mkt'

union all

-- 2 · ¿`tasks` ya está? Tiene que dar 0: si no, la migración es un no-op parcial.
select 'roles con tasks HOY (debe ser 0)',
       count(*)::text
  from public.role_modules where module_slug = 'tasks'

union all

-- 3 · Los nombres exactos de las cuatro policies que la migración va a dropear. Tiene que dar 4.
--     Con menos, la que falte se crea nueva y la vieja sobrevive al lado.
select 'policies de actividades con el nombre esperado (debe ser 4)',
       count(*)::text
  from pg_policies
 where schemaname = 'public' and tablename = 'actividades'
   and policyname in ('colaborador_read', 'actividades_insert_modulo',
                      'actividades_update_modulo', 'actividades_delete_modulo')

union all

-- 4 · ¿Alguna policy de actividades NO está en esa lista? `admin_all` es la única esperada.
select 'policies de actividades fuera de la lista (se espera solo admin_all)',
       coalesce(string_agg(policyname, ', ' order by policyname), '(ninguna)')
  from pg_policies
 where schemaname = 'public' and tablename = 'actividades'
   and policyname not in ('colaborador_read', 'actividades_insert_modulo',
                          'actividades_update_modulo', 'actividades_delete_modulo')

union all

-- 5 · Quién va a quedar asignable/liquidable DESPUÉS. Es la lista que el `<select>` de
--     responsable y el del reporte de pago van a ofrecer: el gate del código ya filtra por
--     `tasks`, así que esto es lo que se ve el lunes.
select 'roles que van a quedar con tasks',
       coalesce(string_agg(distinct role_key, ', ' order by role_key), '(ninguno)')
  from public.role_modules where module_slug = 'stratix-mkt'

union all

-- 6 · Usuarios activos que hoy ven el tablero. El mismo número tiene que seguir viéndolo:
--     si baja, alguien perdió acceso por el despliegue.
select 'usuarios activos que hoy ven el tablero',
       count(*)::text
  from public.usuarios u
 where u.activo
   and (u.rol = 'admin'
        or exists (select 1 from public.role_modules rm
                    where rm.role_key = u.rol and rm.module_slug = 'stratix-mkt'))

union all

-- 7 · RLS encendida en actividades. Reemplazar policies sobre una tabla con RLS apagada las
--     deja escritas y sin efecto — pasó el 29/08 en cuatro tablas y no lo avisó nada.
select 'RLS encendida en actividades (debe ser true)',
       relrowsecurity::text
  from pg_class where oid = 'public.actividades'::regclass;

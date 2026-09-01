-- Tres vistas eran legibles SIN SESIÓN en producción, con la publishable key que viaja en el
-- bundle del navegador. Se le revoca TODO a `anon` sobre las tres.
--
-- CÓMO PASA. Ninguna de las tres declara `security_invoker`, así que corren como su DUEÑO
-- (`postgres`) y NO aplican la RLS de las tablas que leen. `anon` tenía SELECT sobre las tres, y
-- con eso alcanzaba: la RLS de `usuarios`, `marcaciones` y `actividades` está encendida y bien
-- puesta, y las vistas la puentean.
--
-- Verificado contra prod (`ruedelunbtaomhrzgelc`) el 31/08/2026, con la publishable key y sin
-- sesión. Las tablas aguantaron —`usuarios`, `actividades`, `historial` y `notificaciones` dieron
-- 401, o sea que el arreglo del 29/08 que les revocó los GRANT a `anon` sigue en pie— y las tres
-- vistas devolvieron filas:
--
--   v_equipo_hoy              nombre, apellido, ROL, horas trabajadas, tareas activas
--   v_produccion_responsable  nombre y horas de producción por persona y mes
--   v_kpis_globales           totales agregados (sin datos personales)
--
-- Es la misma familia que el incidente del 29/08 —datos de personal legibles por cualquiera que
-- cargue la página— por otra puerta: entonces la RLS estaba apagada; ahora está encendida y la
-- puentean. Por eso el guard que quedó de aquella vez no lo agarró: `pnpm db:rls` consulta
-- `pg_class.relrowsecurity`, y una vista no tiene RLS propia. Daba verde con la fuga abierta.
--
-- REVOKE ALL Y NO REVOKE SELECT. `anon` también tenía INSERT, UPDATE, DELETE, TRUNCATE,
-- REFERENCES y TRIGGER (`anon=arwdDxtm` en el `relacl`). Hoy eso es inerte porque ninguna de las
-- tres es auto-actualizable —`information_schema.views` las da con `is_updatable = NO`—, pero eso
-- es una propiedad de cómo están escritas HOY, no una garantía: reescribir una vista para que sea
-- auto-actualizable no se siente como un cambio de permisos, y ahí el privilegio despierta. Es el
-- mismo criterio del 29/08, que revocó ALL y no SELECT.
--
-- POR QUÉ ESTO Y NO `security_invoker = on`, que es el arreglo de fondo. Porque cambia lo que ve
-- un usuario LOGUEADO y hay una regresión concreta esperándolo: `v_equipo_hoy` calcula
-- `estado_hoy` (presente/salió/ausente) desde `marcaciones`, cuya policy `usuario_own_marcaciones`
-- limita a las filas PROPIAS. Con `security_invoker`, cada persona vería a todo el resto del
-- equipo como 'ausente' y sin horas: la vista pasaría a mentir. Arreglarlo pide primero una policy
-- de lectura de `marcaciones` para el equipo, y eso es su propio cambio con su propia prueba.
-- Este revoke, en cambio, no toca a `authenticated`: verificado en local, el Directorio sigue
-- devolviendo las mismas 7 filas.
--
-- LO QUE ESTA MIGRACIÓN **NO** ARREGLA. La causa raíz es que el esquema `public` tiene
-- `DEFAULT PRIVILEGES` que otorgan `arwdDxtm` a `anon` sobre todo objeto de tipo relación (`r` en
-- `pg_default_acl`) — y una vista ES una relación. O sea: **la próxima vista que alguien cree en
-- `public` nace legible por `anon`**, y como no tiene RLS propia, expone lo que lea. Cerrar eso es
-- una decisión de modelo (el de Supabase es "se otorga todo y gatea la RLS", que funciona para
-- tablas y se rompe para vistas), no un hotfix: va como ítem aparte.
--
-- El `to_regclass` no es adorno: dos de estas vistas mueren en la fase 2 del plan de
-- `fecha_inicio` (docs/superpowers/plans/2026-08-31-fecha-inicio.md), y si esa migración llegara a
-- aplicarse antes en una base creada desde cero, un REVOKE pelado abortaría.

DO $$
DECLARE vista text;
BEGIN
  FOREACH vista IN ARRAY ARRAY['v_equipo_hoy', 'v_produccion_responsable', 'v_kpis_globales'] LOOP
    IF to_regclass('public.' || vista) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', vista);
      RAISE NOTICE 'revocado TODO sobre % para anon', vista;
    END IF;
  END LOOP;
END $$;

-- El guard: si a `anon` le quedó CUALQUIER privilegio sobre alguna de las tres, la migración
-- aborta. Una fuga que se cierra "casi" no se cerró.
DO $$
DECLARE quedan text;
BEGIN
  SELECT string_agg(distinct table_name || ':' || privilege_type, ', ')
    INTO quedan
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND grantee = 'anon'
     AND table_name IN ('v_equipo_hoy', 'v_produccion_responsable', 'v_kpis_globales');
  IF quedan IS NOT NULL THEN
    RAISE EXCEPTION 'anon todavía tiene privilegios sobre las vistas: %', quedan;
  END IF;
END $$;

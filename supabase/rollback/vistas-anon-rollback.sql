-- Vuelta atrás de `20260831214348_revocar_anon_vistas.sql`.
--
-- ⚠️  CORRER ESTO REABRE LA FUGA. Las tres vistas vuelven a ser legibles SIN SESIÓN por cualquiera
-- que cargue la página: no tienen `security_invoker`, corren como su dueño y no aplican la RLS de
-- `usuarios`, `marcaciones` ni `actividades`. Sale nombre, apellido, rol y horas del personal.
-- Existe sólo para restaurar el estado exacto si el revoke rompiera algo inesperado, y en ese
-- caso lo que corresponde es arreglar eso, no dejar esto puesto.
--
-- ESTADO ANTES DE LA MIGRACIÓN, leído de producción (`ruedelunbtaomhrzgelc`) el 31/08/2026 con
-- `select relacl from pg_class`. Las tres tenían exactamente el mismo ACL:
--
--   {postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,
--    authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}
--
-- `arwdDxtm` = INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER. Ninguna tenía grant
-- a PUBLIC (verificado: `tiene_grant_a_public = false` en las tres), por eso alcanza con volver a
-- otorgarle a `anon`. Los otros tres roles nunca se tocaron.

GRANT ALL ON public.v_equipo_hoy             TO anon;
GRANT ALL ON public.v_produccion_responsable TO anon;
GRANT ALL ON public.v_kpis_globales          TO anon;

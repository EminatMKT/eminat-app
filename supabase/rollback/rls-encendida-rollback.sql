-- Rollback de `20260829210325_rls_encendida_cuatro_tablas.sql`.
--
-- Deja las cuatro tablas como estaban antes del 29/08/2026: RLS apagada, con sus policies
-- intactas pero inertes. NO restaura datos porque aquella migración no tocó ninguno — sólo
-- cambió RLS, policies y una función. Por eso el rollback es DDL y no un `psql < predump`.
--
-- CUÁNDO USARLO: si después del push a prod alguien no puede hacer algo que antes hacía —crear
-- una tarea, ver el Directorio, marcar una notificación como leída—. Devuelve el sistema al
-- estado de las 16:00 del 29/08 en un segundo, y ahí se diagnostica con calma.
--
-- OJO CON LO QUE ESTO **NO** DESHACE, y está bien que no lo deshaga:
--
--   * El REVOKE de `anon` de la etapa 1. Eso es lo que cerró la vía no autenticada, se verificó
--     en la app y no tiene relación con estas policies. Volver a otorgarlo reabre el agujero
--     grande. Si de verdad hiciera falta: GRANT ALL ON <tabla> TO anon;
--   * El `SECURITY DEFINER` de `log_cambio_actividad`. Es correcto por sí mismo: un trigger de
--     auditoría tiene que escribir aunque el usuario no tenga permiso sobre la tabla de traza —
--     si el usuario pudiera evitar que su cambio quede registrado, la traza no sirve. Con la RLS
--     apagada de nuevo, ese cambio es inocuo.
--
-- DESPUÉS DE CORRER ESTO, la deuda vuelve: hay que reponer las cuatro tablas en el array
-- `conocidas` de `supabase/checks/rls-encendida.sql`, o el gate va a fallar en el próximo push
-- — que es exactamente lo que tiene que pasar. Una tabla sin RLS no se olvida en silencio.

BEGIN;

ALTER TABLE public.actividades    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones DISABLE ROW LEVEL SECURITY;

COMMIT;

-- Verificación: las cuatro tienen que salir con rls = f.
SELECT c.relname, c.relrowsecurity AS rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('actividades', 'usuarios', 'historial', 'notificaciones')
ORDER BY 1;

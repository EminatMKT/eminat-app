-- Las cuatro policies de `public.actividades` COMO ESTABAN EN PRODUCCIÓN antes de
-- `20260903235201_actividades_policy_tasks.sql` (leídas de `pg_policies` el 2026-09-03).
--
-- El dump de datos del mismo día (`predump-modulo-tasks-20260903.sql`) NO cubre esto: es
-- `--data-only`, y una policy es esquema. Sin este archivo, deshacer la migración obligaba a
-- reconstruir de memoria cuatro condiciones — y la que se escribe mal en una policy no falla,
-- deja pasar o deja fuera en silencio.
--
-- Para revertir: correr este archivo. Vuelve a dejar la lectura y la escritura de actividades
-- gateadas SOLO por `stratix-mkt`.
--
--   pnpm supabase db query --linked -f supabase/rollback/policies-actividades-antes-de-tasks-20260903.sql
--
-- ⚠️ Revertir esto DESPUÉS de haber desplegado el código de `/tasks` deja a todo el que no sea
-- admin sin tablero: Stratix ya no lo muestra y `/tasks` daría lista vacía. El orden de la
-- vuelta atrás es el inverso al de la ida — primero el código, después la policy.

DROP POLICY IF EXISTS "colaborador_read" ON public.actividades;
CREATE POLICY "colaborador_read" ON public.actividades
  FOR SELECT USING (has_module('stratix-mkt'::text));

DROP POLICY IF EXISTS "actividades_insert_modulo" ON public.actividades;
CREATE POLICY "actividades_insert_modulo" ON public.actividades
  FOR INSERT WITH CHECK (has_module('stratix-mkt'::text));

DROP POLICY IF EXISTS "actividades_update_modulo" ON public.actividades;
CREATE POLICY "actividades_update_modulo" ON public.actividades
  FOR UPDATE USING (has_module('stratix-mkt'::text))
           WITH CHECK (has_module('stratix-mkt'::text));

DROP POLICY IF EXISTS "actividades_delete_modulo" ON public.actividades;
CREATE POLICY "actividades_delete_modulo" ON public.actividades
  FOR DELETE USING (has_module('stratix-mkt'::text));

-- `admin_all` (ALL, `is_admin()`) no se toca: la migración no la nombra.

-- =============================================================================
-- ROLLBACK — roles dinámicos (revierte las 3 migraciones de la rama)
--   20260624210414_dynamic_roles
--   20260626210000_reassign_optional_heir
--   20260626220000_realtime_usuarios
-- NO es una migración (vive fuera de supabase/migrations/, no se auto-aplica).
-- =============================================================================
--
-- ⚠️  EL ROLLBACK REAL ES RESTAURAR UN DUMP TOMADO ANTES DEL PUSH.
--     Tomalo SIEMPRE antes de `supabase db push` a la dev/prod:
--
--       pnpm supabase db dump --linked -f supabase/rollback/predump-YYYYMMDD.sql --data-only
--       pnpm supabase db dump --linked -f supabase/rollback/predump-YYYYMMDD-schema.sql
--
--     (o pg_dump directo a la connection string del proyecto).
--
-- Este teardown estructural solo DESMONTA la capa nueva. NO restaura:
--   (a) los valores originales de usuarios.rol — la migración legacy mapeó
--       superadmin/coordinador→admin y colaborador/pasante→stratix360 (lossy);
--   (b) las policies/funciones legacy que dynamic_roles dropeó: tiene_acceso_*,
--       "Acceso cobranzas …", "Acceso research …", superadmin_all_users;
--   (c) el CHECK usuarios_rol_check.
--   Tras correr esto, las tablas con RLS habilitada quedan SIN policy para
--   no-service_role (deny-all) → reaplicá el baseline (remote_schema.sql) o
--   restaurá el dump. Por eso el dump es el camino recomendado.
--
-- Uso (si aun así querés el teardown):  psql "<conn-string>" -f este_archivo.sql
-- =============================================================================

BEGIN;

-- 0) realtime_usuarios -------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables
             WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='usuarios') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.usuarios;
  END IF;
END $$;

-- 1) reassign_optional_heir → restaurar la versión previa (heredero obligatorio,
--    sin limpieza de historial/slots ni rama sin-heredero) -------------------
-- DROP primero: la versión nueva agregó DEFAULTs a p_new_id/p_new_ref y
-- CREATE OR REPLACE no puede quitarlos (misma firma de tipos → DROP por firma).
DROP FUNCTION IF EXISTS public.admin_reassign_and_delete(uuid, uuid, text, text);
CREATE FUNCTION public.admin_reassign_and_delete(
  p_old_id uuid, p_new_id uuid, p_new_ref text, p_status_override text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_old_name text; v_old_ref text; v_transferred int := 0; v_notifs_deleted int := 0;
  v_set_estado text := NULL; v_stamp text;
BEGIN
  SELECT nombre_display, responsable_ref INTO v_old_name, v_old_ref FROM public.usuarios WHERE id = p_old_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuario a borrar % no existe', p_old_id; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_new_id) THEN RAISE EXCEPTION 'Nuevo dueño % no existe', p_new_id; END IF;
  IF p_old_id = p_new_id THEN RAISE EXCEPTION 'No puedes heredar a la misma persona'; END IF;
  IF p_status_override IS NULL THEN NULL;
  ELSIF p_status_override = 'aprobado' THEN v_set_estado := 'Completado';
  ELSIF p_status_override = 'finalizado' THEN v_set_estado := 'Completado';
  ELSIF p_status_override = 'por_aprobar' THEN v_set_estado := 'Por aprobar';
  ELSE RAISE EXCEPTION 'status_override inválido: %', p_status_override; END IF;
  v_stamp := 'Heredada de ' || COALESCE(v_old_name, p_old_id::text) || ' (' || COALESCE(v_old_ref, '?')
          || ') el ' || to_char(now() AT TIME ZONE 'America/Guayaquil', 'YYYY-MM-DD');
  UPDATE public.actividades SET responsable_id = p_new_id, responsable_ref = p_new_ref,
         estado = COALESCE(v_set_estado, estado),
         verificado = CASE WHEN p_status_override = 'aprobado' THEN 'Aprobado' ELSE verificado END,
         notas_jefe = CASE WHEN notas_jefe IS NULL OR notas_jefe = '' THEN v_stamp ELSE notas_jefe || E'\n' || v_stamp END,
         updated_at = now()
   WHERE responsable_id = p_old_id;
  GET DIAGNOSTICS v_transferred = ROW_COUNT;
  UPDATE public.actividades SET solicitante_id  = NULL WHERE solicitante_id  = p_old_id;
  UPDATE public.actividades SET aprobado_por_id = NULL WHERE aprobado_por_id = p_old_id;
  UPDATE public.usuarios    SET validado_por    = NULL WHERE validado_por    = p_old_id;
  DELETE FROM public.notificaciones WHERE usuario_id = p_old_id;
  GET DIAGNOSTICS v_notifs_deleted = ROW_COUNT;
  BEGIN DELETE FROM public.solicitudes WHERE usuario_id = p_old_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM public.marcaciones WHERE usuario_id = p_old_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  DELETE FROM public.usuarios WHERE id = p_old_id;
  RETURN jsonb_build_object('ok', true, 'transferred', v_transferred, 'notifs_deleted', v_notifs_deleted,
                            'old_user', v_old_name, 'old_ref', v_old_ref, 'status_override', p_status_override);
END $$;

-- 2) dynamic_roles -----------------------------------------------------------
-- 2a) trigger + función de protección de rol
DROP TRIGGER  IF EXISTS trg_prevent_rol_self_change ON public.usuarios;
DROP FUNCTION IF EXISTS public.prevent_rol_self_change();

-- 2b) policies creadas por la migración
DROP POLICY IF EXISTS admin_all       ON public.actividades;
DROP POLICY IF EXISTS admin_all       ON public.solicitudes;
DROP POLICY IF EXISTS admin_all       ON public.marcaciones;
DROP POLICY IF EXISTS admin_all       ON public.usuarios;
DROP POLICY IF EXISTS colaborador_read ON public.actividades;
DROP POLICY IF EXISTS mod_access ON public.cobranzas_cuentas;
DROP POLICY IF EXISTS mod_access ON public.cobranzas_depositos;
DROP POLICY IF EXISTS mod_access ON public.cobranzas_ventas;
DROP POLICY IF EXISTS mod_access ON public.research_activities;
DROP POLICY IF EXISTS mod_access ON public.research_campaigns;
DROP POLICY IF EXISTS mod_access ON public.research_leads;
DROP POLICY IF EXISTS mod_access ON public.research_campaign_recipients;
DROP POLICY IF EXISTS roles_read        ON public.roles;
DROP POLICY IF EXISTS role_modules_read ON public.role_modules;

-- 2c) FK + default de usuarios.rol
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_fkey;
ALTER TABLE public.usuarios ALTER COLUMN rol DROP DEFAULT;

-- 2d) helpers (después de dropear las policies que los usan)
DROP FUNCTION IF EXISTS public.has_module(text);
DROP FUNCTION IF EXISTS public.is_admin();

-- 2e) tablas nuevas (CASCADE arrastra role_modules + trg_roles_updated_at)
DROP TABLE IF EXISTS public.role_modules;
DROP TABLE IF EXISTS public.roles CASCADE;

-- Revisá el estado antes de COMMIT. Si algo no cuadra: ROLLBACK; y restaurá el dump.
COMMIT;

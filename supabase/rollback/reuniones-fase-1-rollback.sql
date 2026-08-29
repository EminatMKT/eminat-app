-- Rollback de la fase 1 de Reuniones (20260829221511_reuniones_esquema.sql).
-- Borra sólo objetos nuevos; no toca ningún dato preexistente.
-- El CASCADE de las tablas se lleva sus policies, índices y triggers.
BEGIN;
DROP TABLE IF EXISTS public.reunion_pendientes CASCADE;
DROP TABLE IF EXISTS public.reunion_temas CASCADE;
DROP TABLE IF EXISTS public.reunion_participantes CASCADE;
DROP TABLE IF EXISTS public.reuniones CASCADE;
DROP FUNCTION IF EXISTS public.participa_en_reunion(uuid);
DROP FUNCTION IF EXISTS public.preside_o_secretaria(uuid);
DROP FUNCTION IF EXISTS public.misma_empresa_reunion(uuid);
DROP FUNCTION IF EXISTS public.reunion_abierta(uuid);
DROP DOMAIN IF EXISTS public.estado_pendiente;
DROP DOMAIN IF EXISTS public.tipo_reunion;
DROP DOMAIN IF EXISTS public.rol_en_reunion;
DROP DOMAIN IF EXISTS public.asistencia;
DROP DOMAIN IF EXISTS public.estado_reunion;
DROP DOMAIN IF EXISTS public.modalidad_reunion;
DELETE FROM public.role_modules WHERE module_slug = 'reuniones';
COMMIT;

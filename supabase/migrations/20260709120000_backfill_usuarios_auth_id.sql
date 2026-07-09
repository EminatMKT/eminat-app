-- Backfill de usuarios.auth_id.
--
-- El endpoint admin create-user insertaba `id` (= auth.users.id) pero NO `auth_id`.
-- La RLS (has_module/is_admin/usuario_own_profile) gatea por `auth_id = auth.uid()`,
-- así que todo usuario creado desde el panel admin quedaba con auth_id NULL y la RLS
-- le bloqueaba leer/escribir los datos de su módulo (ej. research_leads no guardaba).
--
-- Como en esos usuarios `id` YA contiene el auth uid, copiamos id -> auth_id.
-- Solo tocamos filas con auth_id NULL cuyo id corresponde a un auth.users real,
-- para no adivinar un auth_id en filas legacy inconsistentes.
UPDATE public.usuarios u
   SET auth_id = u.id
 WHERE u.auth_id IS NULL
   AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id);

-- Backfill de las FK uuid de `actividades` desde los refs de texto.
--
-- Las columnas responsable_id/solicitante_id existen desde el dump original y
-- están vacías: el RPC admin_reassign_and_delete ya filtra por responsable_id,
-- así que hoy transfiere 0 filas al heredar tareas. Esto las llena.
--
-- `solicitado_por` también guarda un responsable_ref (su único valor es
-- 'Coord_MFreddy'), por eso los dos joins van contra usuarios.responsable_ref.
--
-- Idempotente: se puede correr dos veces sin efecto. El DROP de las columnas
-- texto va en la migración siguiente, cuando el código ya no las lea.

UPDATE public.actividades a
   SET responsable_id = u.id
  FROM public.usuarios u
 WHERE u.responsable_ref = a.responsable_ref
   AND a.responsable_id IS DISTINCT FROM u.id;

UPDATE public.actividades a
   SET solicitante_id = u.id
  FROM public.usuarios u
 WHERE u.responsable_ref = a.solicitado_por
   AND a.solicitante_id IS DISTINCT FROM u.id;

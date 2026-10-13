-- Use only after stopping the birthday scheduler and preserving the delivery log.
-- If emails were sent, export public.usuario_cumpleanos_envios before this rollback.
DROP TABLE IF EXISTS public.usuario_cumpleanos_envios;
ALTER TABLE public.usuario_perfil_privado
  DROP CONSTRAINT IF EXISTS usuario_cumple_fecha_valida,
  DROP CONSTRAINT IF EXISTS usuario_cumple_anio_valido,
  DROP COLUMN IF EXISTS cumple_mes,
  DROP COLUMN IF EXISTS cumple_dia,
  DROP COLUMN IF EXISTS anio_nacimiento,
  DROP COLUMN IF EXISTS cumple_confirmado;

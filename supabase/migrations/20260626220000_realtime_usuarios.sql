-- Publica public.usuarios en Realtime para propagar en vivo los cambios que el
-- admin hace sobre un usuario logueado (rol, activo) sin esperar a que refresque.
-- La RLS de SELECT ya permite al usuario leer su propia fila, así que Realtime
-- le entrega el postgres_changes de su row. Idempotente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'usuarios'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios;
  END IF;
END $$;

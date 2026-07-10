-- Publica public.research_leads en Realtime para propagar en vivo a todos los usuarios
-- del módulo los INSERT/UPDATE/DELETE sobre el pool compartido de leads, sin esperar a
-- que refresquen. La RLS (has_module('research')) ya gatea quién recibe los cambios.
-- Idempotente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'research_leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.research_leads;
  END IF;
END $$;

-- REPLICA IDENTITY FULL: sin esto, con RLS activa Realtime NO entrega los eventos DELETE
-- (el row viejo trae solo la PK y no puede autorizar el evento). Con FULL, el old row
-- viaja completo y los DELETE llegan en vivo. También habilita old completo en UPDATE.
ALTER TABLE public.research_leads REPLICA IDENTITY FULL;

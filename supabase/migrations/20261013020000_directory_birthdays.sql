-- Birthdays recur by month and day. Never infer a birth year from a calendar.
ALTER TABLE public.usuario_perfil_privado
  ADD COLUMN cumple_mes smallint,
  ADD COLUMN cumple_dia smallint,
  ADD COLUMN anio_nacimiento smallint,
  ADD COLUMN cumple_confirmado boolean NOT NULL DEFAULT false;

ALTER TABLE public.usuario_perfil_privado ADD CONSTRAINT usuario_cumple_fecha_valida CHECK (
  (cumple_mes IS NULL AND cumple_dia IS NULL AND cumple_confirmado = false)
  OR (cumple_mes BETWEEN 1 AND 12 AND cumple_dia BETWEEN 1 AND
    CASE cumple_mes WHEN 2 THEN 29 WHEN 4 THEN 30 WHEN 6 THEN 30
      WHEN 9 THEN 30 WHEN 11 THEN 30 ELSE 31 END)
);
ALTER TABLE public.usuario_perfil_privado ADD CONSTRAINT usuario_cumple_anio_valido CHECK (
  anio_nacimiento IS NULL OR
  (cumple_mes IS NOT NULL AND anio_nacimiento BETWEEN 1800 AND EXTRACT(YEAR FROM CURRENT_DATE)
    AND (cumple_mes <> 2 OR cumple_dia <> 29 OR
      (anio_nacimiento % 4 = 0 AND (anio_nacimiento % 100 <> 0 OR anio_nacimiento % 400 = 0)))
    AND (anio_nacimiento < EXTRACT(YEAR FROM CURRENT_DATE) OR
      (cumple_mes, cumple_dia) <= (EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(DAY FROM CURRENT_DATE))))
);

CREATE TABLE public.usuario_cumpleanos_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id),
  dedupe_key text NOT NULL UNIQUE,
  cumple_fecha date NOT NULL,
  anio smallint NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
  provider_message_id text,
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuario_cumple_envio_key_check CHECK (dedupe_key = 'birthday/' || usuario_id::text || '/' || anio::text),
  CONSTRAINT usuario_cumple_envio_sent_check CHECK (status <> 'sent' OR (provider_message_id IS NOT NULL AND sent_at IS NOT NULL))
);
CREATE INDEX usuario_cumpleanos_envios_usuario_idx ON public.usuario_cumpleanos_envios (usuario_id, anio);
ALTER TABLE public.usuario_cumpleanos_envios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usuario_cumpleanos_envios FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.usuario_cumpleanos_envios TO service_role;

-- Only the eight dates explicitly confirmed by the Directory owner. These
-- inserts do not touch public.usuarios or its updated_at trigger.
INSERT INTO public.usuario_perfil_privado (usuario_id, cumple_mes, cumple_dia, cumple_confirmado)
SELECT confirmed.usuario_id, confirmed.cumple_mes, confirmed.cumple_dia, true
FROM (VALUES
  ('425d057f-d76f-44ad-a368-29e913498427'::uuid, 2, 19), -- Tasha
  ('f567c0b0-1e5d-46c8-ab57-230576a2b6b0'::uuid, 3, 7), -- Bryan
  ('e73fedf1-437b-462d-90f0-34bc2b9fc319'::uuid, 6, 17), -- Naomi
  ('cab67a3e-4fc0-45d4-bc75-bbe158a6a435'::uuid, 7, 2), -- David
  ('c6409c32-b71b-47bc-bafe-5fe4a549ee3d'::uuid, 8, 29), -- Joselyne
  ('4ceef186-6264-47c4-b38c-cc3946954777'::uuid, 9, 16), -- Wagner
  ('2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid, 10, 31), -- Freddy
  ('0f9e34b8-a4d5-4c40-9e16-cac08fce885f'::uuid, 11, 12) -- Angie
) AS confirmed(usuario_id, cumple_mes, cumple_dia)
JOIN public.usuarios u ON u.id = confirmed.usuario_id AND u.activo = true
WHERE true
ON CONFLICT (usuario_id) DO UPDATE SET
  cumple_mes = EXCLUDED.cumple_mes,
  cumple_dia = EXCLUDED.cumple_dia,
  cumple_confirmado = EXCLUDED.cumple_confirmado,
  updated_at = now();

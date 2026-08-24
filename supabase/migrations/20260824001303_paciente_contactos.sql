-- Contactos multivaluados del paciente. Ver docs/superpowers/specs/2026-08-23-contactos-multivaluados-design.md
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_contacto') THEN
    CREATE DOMAIN public.tipo_contacto AS text
      CONSTRAINT tipo_contacto_valores CHECK (VALUE IN ('telefono','email'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.paciente_contactos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id  uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo         public.tipo_contacto NOT NULL,
  valor        text NOT NULL
    CONSTRAINT paciente_contactos_valor_no_vacio CHECK (btrim(valor) <> ''),
  fuente       public.fuente_paciente NOT NULL DEFAULT 'manual',
  clave_origen text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT paciente_contactos_unico UNIQUE (paciente_id, tipo, valor, fuente)
);

CREATE INDEX IF NOT EXISTS paciente_contactos_paciente_idx
  ON public.paciente_contactos (paciente_id);

-- Lo contradictorio NO va a la tabla de contactos: una persona nació un solo día. Se guarda
-- qué dijo cada sistema, en CRUDO -por eso `text` y no `date`: una fecha ilegible es justo el
-- caso que hay que poder investigar.
ALTER TABLE public.paciente_fuentes
  ADD COLUMN IF NOT EXISTS dob_origen text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paciente_contactos TO authenticated, service_role;

DO $$
DECLARE
  slug   text   := 'medical';
  tablas text[] := ARRAY['paciente_contactos'];
  tbl    text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo % sin ningún rol asignado: la tabla quedaría muda para todos menos el admin', slug;
  END IF;
  FOREACH tbl IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "mod_access" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "mod_access" ON public.%I USING ((SELECT public.has_module(%L)))', tbl, slug);
  END LOOP;
END $$;

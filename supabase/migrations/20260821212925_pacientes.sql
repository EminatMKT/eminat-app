-- pnpm supabase migration new pacientes  →  supabase/migrations/<timestamp>_pacientes.sql
--
-- IDEMPOTENTE: el workaround del repo cuando el historial de la CLI se desalinea es aplicar
-- el .sql por psql, así que todo objeto se crea con IF NOT EXISTS o dentro de un guard.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'genero') THEN
    CREATE DOMAIN public.genero AS text
      CONSTRAINT genero_valores CHECK (VALUE IN ('M','F','NB','ND'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_paciente') THEN
    CREATE DOMAIN public.estado_paciente AS text
      CONSTRAINT estado_paciente_valores CHECK (VALUE IN ('activo','inactivo','alta'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fuente_paciente') THEN
    CREATE DOMAIN public.fuente_paciente AS text
      CONSTRAINT fuente_paciente_valores CHECK (VALUE IN ('ecw','eclinpro','emed','manual'));
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.pacientes_mrn_seq;

CREATE TABLE IF NOT EXISTS public.pacientes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn               text UNIQUE NOT NULL
                      DEFAULT 'MRN-' || to_char(now() AT TIME ZONE 'America/New_York', 'YYYY')
                              || '-' || to_char(nextval('public.pacientes_mrn_seq'), 'FM000000'),
  nombre            text NOT NULL CONSTRAINT pacientes_nombre_no_vacio   CHECK (btrim(nombre)   <> ''),
  apellido          text NOT NULL CONSTRAINT pacientes_apellido_no_vacio CHECK (btrim(apellido) <> ''),
  fecha_nacimiento  date,
  genero            public.genero,
  telefono          text,
  telefono_alt      text,
  email             text,              -- SIN unique: hay familias que comparten correo
  seguro            text,
  seguro_id         text,
  direccion         text,
  estado            public.estado_paciente NOT NULL DEFAULT 'activo',
  alergias          text,
  condiciones       text,
  notas             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.paciente_fuentes (
  -- NULL = tumba: la persona se borró a propósito y NO debe recrearse (ver § Borrado)
  paciente_id   uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  fuente        public.fuente_paciente NOT NULL,
  clave_origen  text NOT NULL,     -- identificador estable DE ESA FUENTE (ver § Identidad)
  nombre_origen text,              -- la cadena tal cual la tenía ese sistema
  ref_externa   text,              -- Chart# de eMedicalPractice; null en las otras
  importado_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fuente, clave_origen)
);
CREATE INDEX IF NOT EXISTS paciente_fuentes_paciente_id_idx
  ON public.paciente_fuentes(paciente_id);

CREATE OR REPLACE TRIGGER trg_pacientes_updated_at BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- GRANTs explícitos. NO son opcionales: ver § Los GRANT.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacientes, public.paciente_fuentes
  TO authenticated, service_role;
GRANT USAGE ON SEQUENCE public.pacientes_mrn_seq TO authenticated, service_role;

-- El slug se declara UNA vez y las policies se generan, como en dynamic_roles.sql.
DO $$
DECLARE
  slug   text   := 'medical';
  tablas text[] := ARRAY['pacientes','paciente_fuentes'];
  tbl    text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo % sin ningún rol asignado: o está mal escrito, o el admin '
                    'le quitó el módulo a todos los roles. Verificar antes de seguir.', slug;
  END IF;
  FOREACH tbl IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "mod_access" ON public.%I', tbl);
    -- El (SELECT …) NO es decorativo: fuerza un InitPlan. Ver § RLS por fila.
    EXECUTE format('CREATE POLICY "mod_access" ON public.%I USING ((SELECT public.has_module(%L)))',
                   tbl, slug);
  END LOOP;
END $$;

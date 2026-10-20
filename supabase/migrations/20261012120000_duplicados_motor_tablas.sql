CREATE TABLE IF NOT EXISTS public.duplicados_entidades (
  entidad            text PRIMARY KEY,
  tabla              text NOT NULL,
  modulo             text NOT NULL,
  hijos              jsonb NOT NULL DEFAULT '[]'::jsonb,
  funcion_candidatos text NOT NULL
);

DO $$
DECLARE
  slug text := 'medical';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'module slug % has no role assigned to it: either it is a typo, or an '
                    'admin removed the module from every role. Check before continuing.', slug;
  END IF;

  INSERT INTO public.duplicados_entidades (entidad, tabla, modulo, hijos, funcion_candidatos) VALUES
    ('pacientes', 'pacientes', slug,
     '[{"tabla":"paciente_fuentes","columna":"paciente_id"},
       {"tabla":"paciente_contactos","columna":"paciente_id"}]'::jsonb,
     'pacientes_candidatos_escaneo')
  ON CONFLICT (entidad) DO NOTHING;
END $$;

-- Named domains instead of inline CHECKs: the constraint gets a name to ALTER, and a second
-- table reuses the type. Wrapped so a re-run of this file stays idempotent.
DO $$
BEGIN
  CREATE DOMAIN public.duplicado_nivel AS text CONSTRAINT duplicado_nivel_valores CHECK (VALUE IN ('exacta','parcial'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  CREATE DOMAIN public.duplicado_origen AS text CONSTRAINT duplicado_origen_valores CHECK (VALUE IN ('import','alta_manual','escaneo'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  CREATE DOMAIN public.duplicado_descarte_motivo AS text CONSTRAINT duplicado_descarte_motivo_valores CHECK (VALUE IN ('no_son_la_misma', 'son_la_misma_separadas'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.duplicados_pendientes (
  entidad       text NOT NULL REFERENCES public.duplicados_entidades(entidad),
  item_id_a     uuid NOT NULL,
  item_id_b     uuid NOT NULL,
  nivel         public.duplicado_nivel NOT NULL,
  origen        public.duplicado_origen NOT NULL,
  detectado_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad, item_id_a, item_id_b),
  CONSTRAINT duplicados_pendientes_par_ordenado CHECK (item_id_a < item_id_b)
);

CREATE TABLE IF NOT EXISTS public.duplicados_descartes (
  entidad       text NOT NULL REFERENCES public.duplicados_entidades(entidad),
  item_id_a     uuid NOT NULL,
  item_id_b     uuid NOT NULL,
  motivo        public.duplicado_descarte_motivo NOT NULL,
  nota          text,
  decidido_por  uuid REFERENCES public.usuarios(id),
  decidido_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad, item_id_a, item_id_b),
  CONSTRAINT duplicados_descartes_par_ordenado CHECK (item_id_a < item_id_b),
  CONSTRAINT duplicados_descartes_nota_si_separadas
    CHECK (motivo <> 'son_la_misma_separadas' OR nota IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.duplicados_fusiones (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad                 text NOT NULL REFERENCES public.duplicados_entidades(entidad),
  ganador_id              uuid NOT NULL,
  perdedor_id             uuid NOT NULL,
  perdedor_snapshot       jsonb NOT NULL,
  ganador_snapshot_previo jsonb NOT NULL,
  hijos_movidos           jsonb NOT NULL,
  decidido_por            uuid REFERENCES public.usuarios(id),
  decidido_at             timestamptz NOT NULL DEFAULT now(),
  revertido_por           uuid REFERENCES public.usuarios(id),
  revertido_at            timestamptz
);

CREATE INDEX IF NOT EXISTS duplicados_fusiones_ganador_id_idx ON public.duplicados_fusiones (ganador_id);
CREATE INDEX IF NOT EXISTS duplicados_fusiones_perdedor_id_idx ON public.duplicados_fusiones (perdedor_id);

REVOKE ALL ON public.duplicados_entidades FROM anon, authenticated;
REVOKE ALL
  ON public.duplicados_pendientes, public.duplicados_descartes, public.duplicados_fusiones
  FROM anon, authenticated;

GRANT SELECT ON public.duplicados_entidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duplicados_entidades TO service_role;

GRANT SELECT
  ON public.duplicados_pendientes, public.duplicados_descartes, public.duplicados_fusiones
  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.duplicados_pendientes, public.duplicados_descartes, public.duplicados_fusiones
  TO service_role;

ALTER TABLE public.duplicados_entidades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicados_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicados_descartes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicados_fusiones   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_por_modulo" ON public.duplicados_entidades;
DROP POLICY IF EXISTS "select_por_modulo" ON public.duplicados_pendientes;
DROP POLICY IF EXISTS "select_por_modulo" ON public.duplicados_descartes;
DROP POLICY IF EXISTS "select_por_modulo" ON public.duplicados_fusiones;

CREATE POLICY "select_por_modulo" ON public.duplicados_entidades
  FOR SELECT USING ((SELECT public.has_module(modulo)));

CREATE POLICY "select_por_modulo" ON public.duplicados_pendientes
  FOR SELECT USING ((SELECT public.has_module(de.modulo)
                      FROM public.duplicados_entidades de
                      WHERE de.entidad = duplicados_pendientes.entidad));

CREATE POLICY "select_por_modulo" ON public.duplicados_descartes
  FOR SELECT USING ((SELECT public.has_module(de.modulo)
                      FROM public.duplicados_entidades de
                      WHERE de.entidad = duplicados_descartes.entidad));

CREATE POLICY "select_por_modulo" ON public.duplicados_fusiones
  FOR SELECT USING ((SELECT public.has_module(de.modulo)
                      FROM public.duplicados_entidades de
                      WHERE de.entidad = duplicados_fusiones.entidad));

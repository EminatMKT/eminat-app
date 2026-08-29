-- Módulo Reuniones, fase 1: los DOMAIN, las cuatro tablas y su RLS por operación.
-- Diseño: docs/superpowers/specs/2026-08-29-reuniones-design.md
-- Rollback: supabase/rollback/reuniones-fase-1-rollback.sql

BEGIN;

-- Los seis catálogos. Van a DOMAIN con nombre y no a un CHECK inline: un CHECK inline es anónimo
-- (hay que buscarlo en pg_constraint para alterarlo) y se copia en cuanto lo pide una segunda
-- tabla. Ver rules/base-de-datos.md.
CREATE DOMAIN public.modalidad_reunion AS text
  CONSTRAINT modalidad_reunion_valores CHECK (VALUE IN ('presencial','virtual','hibrida'));
CREATE DOMAIN public.estado_reunion AS text
  CONSTRAINT estado_reunion_valores CHECK (VALUE IN ('borrador','en_curso','cerrada'));
CREATE DOMAIN public.asistencia AS text
  CONSTRAINT asistencia_valores CHECK (VALUE IN ('presente','ausente','invitado'));
CREATE DOMAIN public.rol_en_reunion AS text
  CONSTRAINT rol_en_reunion_valores CHECK (VALUE IN ('preside','secretario','participante','invitado'));
CREATE DOMAIN public.tipo_reunion AS text
  CONSTRAINT tipo_reunion_valores CHECK (VALUE IN ('seguimiento','planificacion','revision_direccion','comite','extraordinaria'));
CREATE DOMAIN public.estado_pendiente AS text
  CONSTRAINT estado_pendiente_valores CHECK (VALUE IN ('Pendiente','En proceso','Por aprobar','Completado'));

-- `empresa` referencia la clave natural, igual que `actividades.empresa`: `empresas.codigo` es
-- UNIQUE NOT NULL, legible y no codifica nada que ya exista por separado.
CREATE TABLE public.reuniones (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  codigo            text UNIQUE,
  empresa           text NOT NULL REFERENCES public.empresas(codigo) ON UPDATE CASCADE,
  titulo            text NOT NULL,
  tipo              public.tipo_reunion,
  lugar             text,
  modalidad         public.modalidad_reunion NOT NULL DEFAULT 'presencial',
  fecha             date NOT NULL,
  hora_inicio       time,
  hora_fin          time,
  objetivo          text,
  conclusiones      text,
  proxima_fecha     date,
  proxima_notas     text,
  estado            public.estado_reunion NOT NULL DEFAULT 'borrador',
  acta_snapshot     jsonb,
  acta_snapshot_at  timestamptz,
  created_by        uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  CONSTRAINT horas_coherentes CHECK (hora_fin IS NULL OR hora_inicio IS NULL OR hora_fin >= hora_inicio),
  CONSTRAINT acta_cerrada_tiene_snapshot CHECK (estado <> 'cerrada' OR acta_snapshot IS NOT NULL)
);
ALTER TABLE public.reuniones ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reunion_participantes (
  id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  reunion_id       uuid NOT NULL REFERENCES public.reuniones(id) ON DELETE CASCADE,
  usuario_id       uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  invitado_nombre  text,
  invitado_empresa text,
  invitado_email   text,
  rol_en_reunion   public.rol_en_reunion NOT NULL DEFAULT 'participante',
  asistencia       public.asistencia NOT NULL DEFAULT 'presente',
  CONSTRAINT participante_unico UNIQUE (reunion_id, usuario_id),
  CONSTRAINT interno_xor_externo CHECK (
    (usuario_id IS NOT NULL AND invitado_nombre IS NULL) OR
    (usuario_id IS NULL     AND invitado_nombre IS NOT NULL)
  )
);
ALTER TABLE public.reunion_participantes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reunion_temas (
  id          uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  reunion_id  uuid NOT NULL REFERENCES public.reuniones(id) ON DELETE CASCADE,
  posicion    int NOT NULL DEFAULT 0,
  titulo      text NOT NULL,
  descripcion text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE public.reunion_temas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reunion_pendientes (
  id                 uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tema_id            uuid NOT NULL REFERENCES public.reunion_temas(id) ON DELETE CASCADE,
  posicion           int NOT NULL DEFAULT 0,
  titulo             text NOT NULL,
  responsable_id     uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_original     date,
  fecha_comprometida date,
  estado             public.estado_pendiente NOT NULL DEFAULT 'Pendiente',
  completado_por_id  uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  completado_at      timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
ALTER TABLE public.reunion_pendientes ENABLE ROW LEVEL SECURITY;

CREATE INDEX ON public.reunion_temas (reunion_id);
CREATE INDEX ON public.reunion_pendientes (tema_id);
CREATE INDEX ON public.reunion_pendientes (responsable_id) WHERE estado <> 'Completado';
CREATE INDEX ON public.reuniones (empresa, fecha DESC);
CREATE INDEX ON public.reunion_participantes (reunion_id);
CREATE INDEX ON public.reunion_participantes (usuario_id);

-- Las funciones de alcance. SECURITY DEFINER + SET search_path, igual que is_admin(): sin el
-- search_path fijo, quien las invoca puede anteponer un esquema propio. El DEFINER además es lo
-- que evita la recursión — leen reunion_participantes como dueño, salteando su propia policy.
CREATE OR REPLACE FUNCTION public.participa_en_reunion(p_reunion uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reunion_participantes rp
    JOIN public.usuarios u ON u.id = rp.usuario_id
    WHERE rp.reunion_id = p_reunion AND u.auth_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.preside_o_secretaria(p_reunion uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reunion_participantes rp
    JOIN public.usuarios u ON u.id = rp.usuario_id
    WHERE rp.reunion_id = p_reunion
      AND u.auth_id = auth.uid()
      AND rp.rol_en_reunion IN ('preside','secretario')
  );
$$;

CREATE OR REPLACE FUNCTION public.misma_empresa_reunion(p_reunion uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reuniones r
    JOIN public.empresas e ON e.codigo = r.empresa
    JOIN public.usuarios u ON u.empresa_id = e.id
    WHERE r.id = p_reunion AND u.auth_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.reunion_abierta(p_reunion uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.reuniones WHERE id = p_reunion AND estado <> 'cerrada');
$$;

-- Las policies. El slug va en variable con su RAISE: `role_modules.module_slug` es text sin FK,
-- así que un slug mal escrito no falla — deja las tablas mudas para todos menos el admin, que es
-- justo quien escribe y prueba la migración.
DO $$
DECLARE
  slug text := 'reuniones';
  tbl  text;
BEGIN
  INSERT INTO public.role_modules (role_key, module_slug)
  VALUES ('admin', slug) ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug;
  END IF;

  EXECUTE format($f$
    CREATE POLICY "reuniones_select" ON public.reuniones FOR SELECT USING (
      public.has_module(%L) AND (
        public.is_admin() OR public.participa_en_reunion(id) OR public.misma_empresa_reunion(id)
      ))$f$, slug);
  EXECUTE format($f$
    CREATE POLICY "reuniones_insert" ON public.reuniones FOR INSERT
      WITH CHECK (public.has_module(%L))$f$, slug);
  EXECUTE $f$
    CREATE POLICY "reuniones_update" ON public.reuniones FOR UPDATE
      USING      (public.is_admin() OR (public.preside_o_secretaria(id) AND estado <> 'cerrada'))
      WITH CHECK (public.is_admin() OR (public.preside_o_secretaria(id) AND estado <> 'cerrada'))$f$;
  EXECUTE 'CREATE POLICY "reuniones_delete" ON public.reuniones FOR DELETE USING (public.is_admin())';

  -- Participantes y temas: ver la reunión alcanza para leer; preside/secretario para escribir.
  -- El EXISTS contra `reuniones` corre con los permisos de quien pregunta, así que la RLS de
  -- `reuniones` se aplica y sólo devuelve fila si ese usuario puede ver esa reunión.
  -- `tbl` es una variable APARTE de `slug` a propósito: reusar `slug` como iterador la pisaría.
  FOREACH tbl IN ARRAY ARRAY['reunion_participantes','reunion_temas'] LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$I FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.reuniones r WHERE r.id = reunion_id))$f$, tbl);
    EXECUTE format($f$
      CREATE POLICY "%1$s_write" ON public.%1$I FOR ALL
        USING      (public.is_admin() OR (public.preside_o_secretaria(reunion_id) AND public.reunion_abierta(reunion_id)))
        WITH CHECK (public.is_admin() OR (public.preside_o_secretaria(reunion_id) AND public.reunion_abierta(reunion_id)))$f$, tbl);
  END LOOP;

  -- `reunion_pendientes` tiene una policy distinta: su UPDATE es el único que funciona con el
  -- acta cerrada, y es lo que hace posible el arrastre de un pendiente a la reunión siguiente.
  EXECUTE $f$
    CREATE POLICY "reunion_pendientes_select" ON public.reunion_pendientes FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.reunion_temas t WHERE t.id = tema_id))$f$;
  EXECUTE $f$
    CREATE POLICY "reunion_pendientes_write" ON public.reunion_pendientes FOR ALL
      USING (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.reunion_temas t
        WHERE t.id = tema_id AND public.preside_o_secretaria(t.reunion_id) AND public.reunion_abierta(t.reunion_id)))
      WITH CHECK (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.reunion_temas t
        WHERE t.id = tema_id AND public.preside_o_secretaria(t.reunion_id) AND public.reunion_abierta(t.reunion_id)))$f$;

  -- El responsable cierra lo suyo aunque el acta esté cerrada. Va aparte y sólo FOR UPDATE.
  EXECUTE $f$
    CREATE POLICY "reunion_pendientes_responsable" ON public.reunion_pendientes FOR UPDATE
      USING      (responsable_id IN (SELECT u.id FROM public.usuarios u WHERE u.auth_id = auth.uid()))
      WITH CHECK (responsable_id IN (SELECT u.id FROM public.usuarios u WHERE u.auth_id = auth.uid()))$f$;

  -- El admin no lleva filas en role_modules: su acceso es el short-circuit de is_admin().
  -- La fila se insertó sólo para que el RAISE de arriba tenga contra qué validar.
  DELETE FROM public.role_modules WHERE role_key = 'admin' AND module_slug = slug;
END $$;

COMMIT;

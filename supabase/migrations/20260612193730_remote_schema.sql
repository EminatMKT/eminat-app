


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_reassign_and_delete"("p_old_id" "uuid", "p_new_id" "uuid", "p_new_ref" "text", "p_status_override" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_name          text;
  v_old_ref           text;
  v_transferred       int := 0;
  v_notifs_deleted    int := 0;
  v_set_estado        text := NULL;
  v_stamp             text;
BEGIN
  SELECT nombre_display, responsable_ref
    INTO v_old_name, v_old_ref
    FROM public.usuarios
   WHERE id = p_old_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario a borrar % no existe', p_old_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_new_id) THEN
    RAISE EXCEPTION 'Nuevo dueño % no existe', p_new_id;
  END IF;

  IF p_old_id = p_new_id THEN
    RAISE EXCEPTION 'No puedes heredar a la misma persona';
  END IF;

  IF p_status_override IS NULL THEN
    NULL;
  ELSIF p_status_override = 'aprobado' THEN
    v_set_estado := 'Completado';
  ELSIF p_status_override = 'finalizado' THEN
    v_set_estado := 'Completado';
  ELSIF p_status_override = 'por_aprobar' THEN
    v_set_estado := 'Por aprobar';
  ELSE
    RAISE EXCEPTION 'status_override inválido: %', p_status_override;
  END IF;

  v_stamp := 'Heredada de ' || COALESCE(v_old_name, p_old_id::text)
          || ' (' || COALESCE(v_old_ref, '?') || ') el '
          || to_char(now() AT TIME ZONE 'America/Guayaquil', 'YYYY-MM-DD');

  UPDATE public.actividades
     SET responsable_id  = p_new_id,
         responsable_ref = p_new_ref,
         estado          = COALESCE(v_set_estado, estado),
         verificado      = CASE
                             WHEN p_status_override = 'aprobado' THEN 'Aprobado'
                             ELSE verificado
                           END,
         notas_jefe      = CASE
                             WHEN notas_jefe IS NULL OR notas_jefe = ''
                               THEN v_stamp
                             ELSE notas_jefe || E'\n' || v_stamp
                           END,
         updated_at      = now()
   WHERE responsable_id = p_old_id;
  GET DIAGNOSTICS v_transferred = ROW_COUNT;

  UPDATE public.actividades SET solicitante_id  = NULL WHERE solicitante_id  = p_old_id;
  UPDATE public.actividades SET aprobado_por_id = NULL WHERE aprobado_por_id = p_old_id;

  UPDATE public.usuarios SET validado_por = NULL WHERE validado_por = p_old_id;

  DELETE FROM public.notificaciones WHERE usuario_id = p_old_id;
  GET DIAGNOSTICS v_notifs_deleted = ROW_COUNT;

  BEGIN
    DELETE FROM public.solicitudes WHERE usuario_id = p_old_id;
  EXCEPTION
    WHEN undefined_table OR undefined_column THEN NULL;
  END;
  BEGIN
    DELETE FROM public.marcaciones WHERE usuario_id = p_old_id;
  EXCEPTION
    WHEN undefined_table OR undefined_column THEN NULL;
  END;

  DELETE FROM public.usuarios WHERE id = p_old_id;

  RETURN jsonb_build_object(
    'ok',               true,
    'transferred',      v_transferred,
    'notifs_deleted',   v_notifs_deleted,
    'old_user',         v_old_name,
    'old_ref',          v_old_ref,
    'status_override',  p_status_override
  );
END;
$$;


ALTER FUNCTION "public"."admin_reassign_and_delete"("p_old_id" "uuid", "p_new_id" "uuid", "p_new_ref" "text", "p_status_override" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."asignar_departamento_por_email"("p_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_dominio text;
  v_dept_id uuid;
begin
  v_dominio := '@' || split_part(p_email, '@', 2);

  select departamento_id into v_dept_id
  from dominios_corporativos
  where dominio = v_dominio and activo = true;

  return v_dept_id;
end;
$$;


ALTER FUNCTION "public"."asignar_departamento_por_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generar_numero_solicitud"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.numero = (select coalesce(max(numero), 0) + 1 from solicitudes);
  return new;
end;
$$;


ALTER FUNCTION "public"."generar_numero_solicitud"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_cambio_actividad"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'UPDATE' then
    if old.estado != new.estado then
      insert into historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo)
      values ('actividades', new.id, 'updated', 'estado', old.estado, new.estado);
    end if;
    if old.verificado != new.verificado then
      insert into historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo)
      values ('actividades', new.id, 'updated', 'verificado', old.verificado, new.verificado);
    end if;
  elsif tg_op = 'INSERT' then
    insert into historial (tabla, registro_id, accion)
    values ('actividades', new.id, 'created');
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."log_cambio_actividad"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_entrada"("p_usuario_id" "uuid", "p_ip" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_id uuid;
  v_marca_hora boolean;
  v_tipo_jornada text;
begin
  -- Verifica si el usuario registra horario
  select marca_hora, tipo_jornada into v_marca_hora, v_tipo_jornada
  from usuarios where id = p_usuario_id;

  -- Solo registra si marca_hora = true (no pasantes)
  if not v_marca_hora then
    return null;
  end if;

  -- Inserta o actualiza la marcación del día
  insert into marcaciones (usuario_id, fecha, hora_entrada, ip_entrada)
  values (p_usuario_id, current_date, now(), p_ip)
  on conflict (usuario_id, fecha)
  do nothing  -- Si ya entró hoy, no sobrescribe
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."registrar_entrada"("p_usuario_id" "uuid", "p_ip" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_salida"("p_usuario_id" "uuid", "p_ip" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update marcaciones
  set hora_salida = now(), ip_salida = p_ip
  where usuario_id = p_usuario_id
  and fecha = current_date
  and hora_salida is null;
end;
$$;


ALTER FUNCTION "public"."registrar_salida"("p_usuario_id" "uuid", "p_ip" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tiene_acceso_cobranzas"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    auth.email() = 'majo@eminat.net'
    OR auth.email() = 'freddy@eminat.net'
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE email = auth.email()
      AND rol = 'admin'
    )
  );
END;
$$;


ALTER FUNCTION "public"."tiene_acceso_cobranzas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tiene_acceso_research"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE email = auth.email()
      AND rol IN ('admin', 'superadmin', 'coordinador')
    )
    OR auth.email() = 'freddy@eminat.net'
    OR auth.email() = 'jonathan@eminat.net'
  );
END;
$$;


ALTER FUNCTION "public"."tiene_acceso_research"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."actividades" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descripcion" "text",
    "responsable_id" "uuid",
    "responsable_ref" "text",
    "area_id" "uuid",
    "area_ref" "text",
    "dias_produccion" numeric(5,1),
    "horas" numeric(6,1),
    "trimestre" "text",
    "mes" "text",
    "semana" "text",
    "fecha_requerida" "date",
    "fecha_entrega" "date",
    "estado" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "verificado" "text" DEFAULT 'Pendiente'::"text",
    "solicitado_por" "text",
    "solicitante_id" "uuid",
    "drive_url" "text",
    "aprobado_por_id" "uuid",
    "fecha_aprobacion" timestamp with time zone,
    "notas_jefe" "text",
    "bloqueada" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sheet_row" integer,
    CONSTRAINT "actividades_estado_check" CHECK (("estado" = ANY (ARRAY['Pendiente'::"text", 'En proceso'::"text", 'Completado'::"text", 'Por aprobar'::"text", 'Rechazado'::"text", 'Cancelado'::"text"]))),
    CONSTRAINT "actividades_mes_check" CHECK (("mes" = ANY (ARRAY['Enero'::"text", 'Febrero'::"text", 'Marzo'::"text", 'Abril'::"text", 'Mayo'::"text", 'Junio'::"text", 'Julio'::"text", 'Agosto'::"text", 'Septiembre'::"text", 'Octubre'::"text", 'Noviembre'::"text", 'Diciembre'::"text"]))),
    CONSTRAINT "actividades_semana_check" CHECK (("semana" = ANY (ARRAY['S1'::"text", 'S2'::"text", 'S3'::"text", 'S4'::"text", 'S5'::"text"]))),
    CONSTRAINT "actividades_trimestre_check" CHECK (("trimestre" = ANY (ARRAY['Q1'::"text", 'Q2'::"text", 'Q3'::"text", 'Q4'::"text"]))),
    CONSTRAINT "actividades_verificado_check" CHECK (("verificado" = ANY (ARRAY['Aprobado'::"text", 'Por aprobar'::"text", 'Pendiente'::"text", 'Rechazado'::"text"])))
);


ALTER TABLE "public"."actividades" OWNER TO "postgres";


COMMENT ON TABLE "public"."actividades" IS 'Tabla principal de tareas — migración directa del Google Sheet "3.1 Actividades"';



COMMENT ON COLUMN "public"."actividades"."sheet_row" IS 'Número de fila original en Google Sheet — para verificación de migración';



CREATE TABLE IF NOT EXISTS "public"."areas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "color" "text" NOT NULL,
    "descripcion" "text",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cobranzas_cuentas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "laboratorio" "text" NOT NULL,
    "estudio" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "vencido" numeric(12,2) DEFAULT 0 NOT NULL,
    "por_vencer" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_adeudado" numeric(12,2) GENERATED ALWAYS AS (("vencido" + "por_vencer")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cobranzas_cuentas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cobranzas_depositos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "periodo" "text" NOT NULL,
    "banco" "text" NOT NULL,
    "contratante" "text" NOT NULL,
    "identificacion" "text",
    "estudio" "text" NOT NULL,
    "depositado" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cobranzas_depositos_periodo_check" CHECK (("periodo" = ANY (ARRAY['1Q'::"text", '2Q'::"text"])))
);


ALTER TABLE "public"."cobranzas_depositos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cobranzas_ventas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mes" "text" NOT NULL,
    "periodo" "text" NOT NULL,
    "laboratorio" "text" NOT NULL,
    "estudio" "text" NOT NULL,
    "monto" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cobranzas_ventas_periodo_check" CHECK (("periodo" = ANY (ARRAY['1Q'::"text", '2Q'::"text"])))
);


ALTER TABLE "public"."cobranzas_ventas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departamentos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "color" "text" DEFAULT '#7C6FF7'::"text" NOT NULL,
    "icono" "text",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."departamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dominios_corporativos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "dominio" "text" NOT NULL,
    "departamento_id" "uuid",
    "clock_in_activo" boolean DEFAULT true,
    "descripcion" "text",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dominios_corporativos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historial" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tabla" "text" NOT NULL,
    "registro_id" "uuid" NOT NULL,
    "accion" "text" NOT NULL,
    "campo" "text",
    "valor_anterior" "text",
    "valor_nuevo" "text",
    "usuario_id" "uuid",
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."historial" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marcaciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "hora_entrada" timestamp with time zone,
    "hora_salida" timestamp with time zone,
    "horas_trabajadas" numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (("hora_salida" IS NOT NULL) AND ("hora_entrada" IS NOT NULL)) THEN (EXTRACT(epoch FROM ("hora_salida" - "hora_entrada")) / 3600.0)
    ELSE NULL::numeric
END) STORED,
    "tipo" "text" DEFAULT 'normal'::"text",
    "observaciones" "text",
    "ip_entrada" "text",
    "ip_salida" "text",
    "dispositivo" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "marcaciones_tipo_check" CHECK (("tipo" = ANY (ARRAY['normal'::"text", 'tardanza'::"text", 'ausencia'::"text", 'remoto'::"text", 'feriado'::"text"])))
);


ALTER TABLE "public"."marcaciones" OWNER TO "postgres";


COMMENT ON TABLE "public"."marcaciones" IS 'Registro de asistencia — solo colaboradores tipo A con marca_hora=true';



CREATE TABLE IF NOT EXISTS "public"."notificaciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "mensaje" "text",
    "leida" boolean DEFAULT false,
    "actividad_id" "uuid",
    "solicitud_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notificaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."research_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid",
    "tipo" "text" NOT NULL,
    "fecha" timestamp with time zone DEFAULT "now"(),
    "resultado" "text",
    "notas" "text",
    "proximo_paso" "text",
    "proximo_paso_fecha" "date",
    "creado_por" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "research_activities_tipo_check" CHECK (("tipo" = ANY (ARRAY['Email'::"text", 'Llamada'::"text", 'Reunión'::"text", 'SMS'::"text", 'Nota'::"text"])))
);


ALTER TABLE "public"."research_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."research_campaign_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid",
    "lead_id" "uuid",
    "email" "text",
    "estado" "text" DEFAULT 'Pendiente'::"text",
    "enviado_at" timestamp with time zone,
    "abierto_at" timestamp with time zone,
    CONSTRAINT "research_campaign_recipients_estado_check" CHECK (("estado" = ANY (ARRAY['Pendiente'::"text", 'Enviado'::"text", 'Abierto'::"text", 'Error'::"text"])))
);


ALTER TABLE "public"."research_campaign_recipients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."research_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "asunto" "text",
    "contenido" "text",
    "estado" "text" DEFAULT 'Borrador'::"text",
    "fecha_envio" timestamp with time zone,
    "total_destinatarios" integer DEFAULT 0,
    "total_abiertos" integer DEFAULT 0,
    "total_clicks" integer DEFAULT 0,
    "creado_por" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "research_campaigns_estado_check" CHECK (("estado" = ANY (ARRAY['Borrador'::"text", 'Programado'::"text", 'Enviado'::"text", 'Cancelado'::"text"]))),
    CONSTRAINT "research_campaigns_tipo_check" CHECK (("tipo" = ANY (ARRAY['Newsletter'::"text", 'Email'::"text", 'SMS'::"text"])))
);


ALTER TABLE "public"."research_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."research_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date_added" "date",
    "conditions" "text",
    "nct_number" "text",
    "record_link" "text",
    "official_title" "text",
    "brief_explanation" "text",
    "phase" "text",
    "study_type" "text",
    "recruitment_status" "text",
    "study_start_date" "date",
    "primary_completion_date" "date",
    "spain_focus" boolean DEFAULT false,
    "countries" "text",
    "lead_sponsor" "text",
    "sponsor_type" "text",
    "contact_name" "text",
    "contact_role" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "contact_source" "text",
    "contact2_name" "text",
    "contact2_role" "text",
    "contact2_email" "text",
    "contact2_phone" "text",
    "stage" "text" DEFAULT 'Identificado'::"text",
    "next_followup_date" "date",
    "email_date" "date",
    "notes" "text",
    "internal_note" "text",
    "owner_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "research_leads_stage_check" CHECK (("stage" = ANY (ARRAY['Identificado'::"text", 'Calificado'::"text", 'Outreach'::"text", 'Contacto'::"text", 'Discovery/Feasibility'::"text", 'Docs'::"text", 'Negociación'::"text", 'Awarded'::"text", 'Cerrado'::"text"])))
);


ALTER TABLE "public"."research_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."slots_calendario" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "fecha" "date" NOT NULL,
    "hora_inicio" time without time zone,
    "hora_fin" time without time zone,
    "disponible" boolean DEFAULT true,
    "usuario_id" "uuid",
    "actividad_id" "uuid",
    "solicitud_id" "uuid",
    "area_id" "uuid",
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."slots_calendario" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."solicitudes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "numero" integer NOT NULL,
    "solicitante_id" "uuid",
    "email_solicitante" "text",
    "nombre_solicitante" "text",
    "titulo" "text" NOT NULL,
    "descripcion" "text" NOT NULL,
    "tipo_entregable" "text",
    "archivos_referencia" "text"[],
    "area_id" "uuid",
    "departamento_destino" "text",
    "asignado_a" "uuid",
    "prioridad" "text" DEFAULT 'media'::"text",
    "estado" "text" DEFAULT 'recibida'::"text",
    "fecha_requerida" "date",
    "fecha_inicio_estimada" "date",
    "fecha_entrega_estimada" "date",
    "fecha_entrega_real" "date",
    "actividad_id" "uuid",
    "notas_coordinador" "text",
    "motivo_rechazo" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "solicitudes_estado_check" CHECK (("estado" = ANY (ARRAY['recibida'::"text", 'en_revision'::"text", 'asignada'::"text", 'en_proceso'::"text", 'completada'::"text", 'rechazada'::"text", 'cancelada'::"text"]))),
    CONSTRAINT "solicitudes_prioridad_check" CHECK (("prioridad" = ANY (ARRAY['baja'::"text", 'media'::"text", 'alta'::"text", 'urgente'::"text"])))
);


ALTER TABLE "public"."solicitudes" OWNER TO "postgres";


COMMENT ON TABLE "public"."solicitudes" IS 'Sistema de solicitudes internas y externas — reemplaza el flujo manual';



CREATE SEQUENCE IF NOT EXISTS "public"."solicitudes_numero_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."solicitudes_numero_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."solicitudes_numero_seq" OWNED BY "public"."solicitudes"."numero";



CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "auth_id" "uuid",
    "email" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "apellido" "text" NOT NULL,
    "nombre_display" "text" GENERATED ALWAYS AS ((("nombre" || ' '::"text") || "apellido")) STORED,
    "departamento_id" "uuid",
    "rol" "text" DEFAULT 'colaborador'::"text" NOT NULL,
    "id_sheet" "text",
    "tipo_jornada" "text" DEFAULT 'A'::"text",
    "horas_dia" numeric(4,1) DEFAULT 8.0,
    "horas_semana" numeric(5,1) DEFAULT 40.0,
    "horas_mes" numeric(6,1) DEFAULT 160.0,
    "marca_hora" boolean DEFAULT true,
    "fecha_inicio" "date",
    "activo" boolean DEFAULT true,
    "validado" boolean DEFAULT false,
    "validado_por" "uuid",
    "validado_en" timestamp with time zone,
    "avatar_url" "text",
    "color" "text" DEFAULT '#7C6FF7'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tipo" "text" DEFAULT 'A'::"text",
    "estado" "text" DEFAULT 'activo'::"text",
    "ubicacion" "text" DEFAULT 'Guayaquil, Ecuador'::"text",
    "online_at" timestamp with time zone,
    "cargo" "text",
    "empresa" "text" DEFAULT 'Eminat Holding'::"text",
    "responsable_ref" "text",
    CONSTRAINT "usuarios_rol_check" CHECK (("rol" = ANY (ARRAY['admin'::"text", 'stratix360'::"text", 'finanzas'::"text", 'contabilidad_rrhh'::"text", 'medico'::"text", 'investigacion'::"text", 'medico_investigacion'::"text", 'superadmin'::"text", 'coordinador'::"text", 'colaborador'::"text", 'pasante'::"text"]))),
    CONSTRAINT "usuarios_tipo_jornada_check" CHECK (("tipo_jornada" = ANY (ARRAY['A'::"text", 'B'::"text", 'externo'::"text"])))
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


COMMENT ON TABLE "public"."usuarios" IS 'Usuarios del holding Eminat — todos los departamentos';



COMMENT ON COLUMN "public"."usuarios"."id_sheet" IS 'ID usado en Google Sheet (ej: DG_Joselyn) — para migración de datos históricos';



CREATE OR REPLACE VIEW "public"."v_equipo_hoy" AS
 SELECT "u"."id",
    "u"."nombre",
    "u"."apellido",
    "u"."nombre_display",
    "u"."color",
    "u"."rol",
    "u"."tipo_jornada",
    "u"."id_sheet",
    "m"."hora_entrada",
    "m"."hora_salida",
    "m"."horas_trabajadas",
        CASE
            WHEN (("m"."hora_entrada" IS NOT NULL) AND ("m"."hora_salida" IS NULL)) THEN 'presente'::"text"
            WHEN (("m"."hora_entrada" IS NOT NULL) AND ("m"."hora_salida" IS NOT NULL)) THEN 'salio'::"text"
            WHEN ("u"."marca_hora" = false) THEN 'sin_marcacion'::"text"
            ELSE 'ausente'::"text"
        END AS "estado_hoy",
    ( SELECT "count"(*) AS "count"
           FROM "public"."actividades" "a"
          WHERE (("a"."responsable_id" = "u"."id") AND ("a"."estado" = ANY (ARRAY['En proceso'::"text", 'Pendiente'::"text"])))) AS "tareas_activas"
   FROM ("public"."usuarios" "u"
     LEFT JOIN "public"."marcaciones" "m" ON ((("m"."usuario_id" = "u"."id") AND ("m"."fecha" = CURRENT_DATE))))
  WHERE ("u"."activo" = true)
  ORDER BY "u"."nombre";


ALTER VIEW "public"."v_equipo_hoy" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_kpis_globales" AS
 SELECT "count"(*) AS "total_tareas",
    "count"(
        CASE
            WHEN ("estado" = 'Completado'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completadas",
    "count"(
        CASE
            WHEN ("estado" = 'Por aprobar'::"text") THEN 1
            ELSE NULL::integer
        END) AS "por_aprobar",
    "count"(
        CASE
            WHEN ("estado" = 'En proceso'::"text") THEN 1
            ELSE NULL::integer
        END) AS "en_proceso",
    "count"(
        CASE
            WHEN ("estado" = 'Pendiente'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pendientes",
    COALESCE("sum"("dias_produccion"), (0)::numeric) AS "total_dias",
    COALESCE("sum"("horas"), (0)::numeric) AS "total_horas",
    "trimestre",
    "mes"
   FROM "public"."actividades"
  GROUP BY "trimestre", "mes";


ALTER VIEW "public"."v_kpis_globales" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_produccion_responsable" AS
 SELECT "u"."nombre_display",
    "u"."id_sheet",
    "u"."color",
    "count"("a"."id") AS "total_tareas",
    "count"(
        CASE
            WHEN ("a"."estado" = 'Completado'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completadas",
    "count"(
        CASE
            WHEN ("a"."estado" = 'Por aprobar'::"text") THEN 1
            ELSE NULL::integer
        END) AS "por_aprobar",
    "count"(
        CASE
            WHEN ("a"."estado" = 'En proceso'::"text") THEN 1
            ELSE NULL::integer
        END) AS "en_proceso",
    COALESCE("sum"("a"."dias_produccion"), (0)::numeric) AS "total_dias",
    COALESCE("sum"("a"."horas"), (0)::numeric) AS "total_horas",
    "a"."trimestre",
    "a"."mes"
   FROM ("public"."usuarios" "u"
     LEFT JOIN "public"."actividades" "a" ON (("a"."responsable_id" = "u"."id")))
  WHERE ("u"."activo" = true)
  GROUP BY "u"."id", "u"."nombre_display", "u"."id_sheet", "u"."color", "a"."trimestre", "a"."mes";


ALTER VIEW "public"."v_produccion_responsable" OWNER TO "postgres";


ALTER TABLE ONLY "public"."solicitudes" ALTER COLUMN "numero" SET DEFAULT "nextval"('"public"."solicitudes_numero_seq"'::"regclass");



ALTER TABLE ONLY "public"."actividades"
    ADD CONSTRAINT "actividades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."areas"
    ADD CONSTRAINT "areas_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."areas"
    ADD CONSTRAINT "areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cobranzas_cuentas"
    ADD CONSTRAINT "cobranzas_cuentas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cobranzas_depositos"
    ADD CONSTRAINT "cobranzas_depositos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cobranzas_ventas"
    ADD CONSTRAINT "cobranzas_ventas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departamentos"
    ADD CONSTRAINT "departamentos_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."departamentos"
    ADD CONSTRAINT "departamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dominios_corporativos"
    ADD CONSTRAINT "dominios_corporativos_dominio_key" UNIQUE ("dominio");



ALTER TABLE ONLY "public"."dominios_corporativos"
    ADD CONSTRAINT "dominios_corporativos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historial"
    ADD CONSTRAINT "historial_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marcaciones"
    ADD CONSTRAINT "marcaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marcaciones"
    ADD CONSTRAINT "marcaciones_usuario_id_fecha_key" UNIQUE ("usuario_id", "fecha");



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."research_activities"
    ADD CONSTRAINT "research_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."research_campaign_recipients"
    ADD CONSTRAINT "research_campaign_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."research_campaigns"
    ADD CONSTRAINT "research_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."research_leads"
    ADD CONSTRAINT "research_leads_nct_number_key" UNIQUE ("nct_number");



ALTER TABLE ONLY "public"."research_leads"
    ADD CONSTRAINT "research_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slots_calendario"
    ADD CONSTRAINT "slots_calendario_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solicitudes"
    ADD CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_auth_id_key" UNIQUE ("auth_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_actividades_area" ON "public"."actividades" USING "btree" ("area_id");



CREATE INDEX "idx_actividades_estado" ON "public"."actividades" USING "btree" ("estado");



CREATE INDEX "idx_actividades_fecha_ent" ON "public"."actividades" USING "btree" ("fecha_entrega");



CREATE INDEX "idx_actividades_mes" ON "public"."actividades" USING "btree" ("mes");



CREATE INDEX "idx_actividades_responsable" ON "public"."actividades" USING "btree" ("responsable_id");



CREATE INDEX "idx_actividades_trimestre" ON "public"."actividades" USING "btree" ("trimestre");



CREATE INDEX "idx_historial_registro" ON "public"."historial" USING "btree" ("tabla", "registro_id");



CREATE INDEX "idx_marcaciones_fecha" ON "public"."marcaciones" USING "btree" ("fecha");



CREATE INDEX "idx_marcaciones_usuario" ON "public"."marcaciones" USING "btree" ("usuario_id");



CREATE INDEX "idx_notificaciones_usuario" ON "public"."notificaciones" USING "btree" ("usuario_id", "leida");



CREATE INDEX "idx_solicitudes_estado" ON "public"."solicitudes" USING "btree" ("estado");



CREATE INDEX "idx_solicitudes_solicitante" ON "public"."solicitudes" USING "btree" ("solicitante_id");



CREATE OR REPLACE TRIGGER "trg_actividades_updated_at" BEFORE UPDATE ON "public"."actividades" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_log_actividad" AFTER INSERT OR UPDATE ON "public"."actividades" FOR EACH ROW EXECUTE FUNCTION "public"."log_cambio_actividad"();



CREATE OR REPLACE TRIGGER "trg_solicitud_numero" BEFORE INSERT ON "public"."solicitudes" FOR EACH ROW EXECUTE FUNCTION "public"."generar_numero_solicitud"();



CREATE OR REPLACE TRIGGER "trg_solicitudes_updated_at" BEFORE UPDATE ON "public"."solicitudes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_usuarios_updated_at" BEFORE UPDATE ON "public"."usuarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."actividades"
    ADD CONSTRAINT "actividades_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."actividades"
    ADD CONSTRAINT "actividades_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id");



ALTER TABLE ONLY "public"."actividades"
    ADD CONSTRAINT "actividades_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."actividades"
    ADD CONSTRAINT "actividades_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."dominios_corporativos"
    ADD CONSTRAINT "dominios_corporativos_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id");



ALTER TABLE ONLY "public"."historial"
    ADD CONSTRAINT "historial_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."marcaciones"
    ADD CONSTRAINT "marcaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades"("id");



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id");



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."research_activities"
    ADD CONSTRAINT "research_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."research_leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."research_campaign_recipients"
    ADD CONSTRAINT "research_campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."research_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."research_campaign_recipients"
    ADD CONSTRAINT "research_campaign_recipients_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."research_leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."slots_calendario"
    ADD CONSTRAINT "slots_calendario_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades"("id");



ALTER TABLE ONLY "public"."slots_calendario"
    ADD CONSTRAINT "slots_calendario_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id");



ALTER TABLE ONLY "public"."slots_calendario"
    ADD CONSTRAINT "slots_calendario_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id");



ALTER TABLE ONLY "public"."slots_calendario"
    ADD CONSTRAINT "slots_calendario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."solicitudes"
    ADD CONSTRAINT "solicitudes_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades"("id");



ALTER TABLE ONLY "public"."solicitudes"
    ADD CONSTRAINT "solicitudes_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id");



ALTER TABLE ONLY "public"."solicitudes"
    ADD CONSTRAINT "solicitudes_asignado_a_fkey" FOREIGN KEY ("asignado_a") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."solicitudes"
    ADD CONSTRAINT "solicitudes_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_validado_por_fkey" FOREIGN KEY ("validado_por") REFERENCES "public"."usuarios"("id");



CREATE POLICY "Acceso cobranzas cuentas" ON "public"."cobranzas_cuentas" USING ("public"."tiene_acceso_cobranzas"());



CREATE POLICY "Acceso cobranzas depositos" ON "public"."cobranzas_depositos" USING ("public"."tiene_acceso_cobranzas"());



CREATE POLICY "Acceso cobranzas ventas" ON "public"."cobranzas_ventas" USING ("public"."tiene_acceso_cobranzas"());



CREATE POLICY "Acceso research activities" ON "public"."research_activities" USING ("public"."tiene_acceso_research"());



CREATE POLICY "Acceso research campaigns" ON "public"."research_campaigns" USING ("public"."tiene_acceso_research"());



CREATE POLICY "Acceso research leads" ON "public"."research_leads" USING ("public"."tiene_acceso_research"());



CREATE POLICY "Acceso research recipients" ON "public"."research_campaign_recipients" USING ("public"."tiene_acceso_research"());



CREATE POLICY "Lectura autenticada de usuarios" ON "public"."usuarios" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública de usuarios" ON "public"."usuarios" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."areas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cobranzas_cuentas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cobranzas_depositos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cobranzas_ventas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "colaborador_read" ON "public"."actividades" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND ("u"."rol" = ANY (ARRAY['colaborador'::"text", 'coordinador'::"text", 'pasante'::"text"]))))));



ALTER TABLE "public"."departamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dominios_corporativos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marcaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."research_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."research_campaign_recipients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."research_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."research_leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."slots_calendario" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."solicitudes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "superadmin_all" ON "public"."actividades" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."auth_id" = "auth"."uid"()) AND ("usuarios"."rol" = 'superadmin'::"text")))));



CREATE POLICY "superadmin_all" ON "public"."solicitudes" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."auth_id" = "auth"."uid"()) AND ("usuarios"."rol" = 'superadmin'::"text")))));



CREATE POLICY "superadmin_all_marcaciones" ON "public"."marcaciones" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."auth_id" = "auth"."uid"()) AND ("usuarios"."rol" = ANY (ARRAY['superadmin'::"text", 'coordinador'::"text"]))))));



CREATE POLICY "superadmin_all_users" ON "public"."usuarios" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "usuarios_1"
  WHERE (("usuarios_1"."auth_id" = "auth"."uid"()) AND ("usuarios_1"."rol" = 'superadmin'::"text")))));



CREATE POLICY "usuario_own_marcaciones" ON "public"."marcaciones" USING (("usuario_id" = ( SELECT "usuarios"."id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."auth_id" = "auth"."uid"()))));



CREATE POLICY "usuario_own_profile" ON "public"."usuarios" FOR SELECT USING (("auth_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notificaciones";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."admin_reassign_and_delete"("p_old_id" "uuid", "p_new_id" "uuid", "p_new_ref" "text", "p_status_override" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_reassign_and_delete"("p_old_id" "uuid", "p_new_id" "uuid", "p_new_ref" "text", "p_status_override" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_reassign_and_delete"("p_old_id" "uuid", "p_new_id" "uuid", "p_new_ref" "text", "p_status_override" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."asignar_departamento_por_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."asignar_departamento_por_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."asignar_departamento_por_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generar_numero_solicitud"() TO "anon";
GRANT ALL ON FUNCTION "public"."generar_numero_solicitud"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generar_numero_solicitud"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_cambio_actividad"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_cambio_actividad"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_cambio_actividad"() TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_entrada"("p_usuario_id" "uuid", "p_ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_entrada"("p_usuario_id" "uuid", "p_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_entrada"("p_usuario_id" "uuid", "p_ip" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_salida"("p_usuario_id" "uuid", "p_ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_salida"("p_usuario_id" "uuid", "p_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_salida"("p_usuario_id" "uuid", "p_ip" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tiene_acceso_cobranzas"() TO "anon";
GRANT ALL ON FUNCTION "public"."tiene_acceso_cobranzas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tiene_acceso_cobranzas"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tiene_acceso_research"() TO "anon";
GRANT ALL ON FUNCTION "public"."tiene_acceso_research"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tiene_acceso_research"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."actividades" TO "anon";
GRANT ALL ON TABLE "public"."actividades" TO "authenticated";
GRANT ALL ON TABLE "public"."actividades" TO "service_role";



GRANT ALL ON TABLE "public"."areas" TO "anon";
GRANT ALL ON TABLE "public"."areas" TO "authenticated";
GRANT ALL ON TABLE "public"."areas" TO "service_role";



GRANT ALL ON TABLE "public"."cobranzas_cuentas" TO "anon";
GRANT ALL ON TABLE "public"."cobranzas_cuentas" TO "authenticated";
GRANT ALL ON TABLE "public"."cobranzas_cuentas" TO "service_role";



GRANT ALL ON TABLE "public"."cobranzas_depositos" TO "anon";
GRANT ALL ON TABLE "public"."cobranzas_depositos" TO "authenticated";
GRANT ALL ON TABLE "public"."cobranzas_depositos" TO "service_role";



GRANT ALL ON TABLE "public"."cobranzas_ventas" TO "anon";
GRANT ALL ON TABLE "public"."cobranzas_ventas" TO "authenticated";
GRANT ALL ON TABLE "public"."cobranzas_ventas" TO "service_role";



GRANT ALL ON TABLE "public"."departamentos" TO "anon";
GRANT ALL ON TABLE "public"."departamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."departamentos" TO "service_role";



GRANT ALL ON TABLE "public"."dominios_corporativos" TO "anon";
GRANT ALL ON TABLE "public"."dominios_corporativos" TO "authenticated";
GRANT ALL ON TABLE "public"."dominios_corporativos" TO "service_role";



GRANT ALL ON TABLE "public"."historial" TO "anon";
GRANT ALL ON TABLE "public"."historial" TO "authenticated";
GRANT ALL ON TABLE "public"."historial" TO "service_role";



GRANT ALL ON TABLE "public"."marcaciones" TO "anon";
GRANT ALL ON TABLE "public"."marcaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."marcaciones" TO "service_role";



GRANT ALL ON TABLE "public"."notificaciones" TO "anon";
GRANT ALL ON TABLE "public"."notificaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."notificaciones" TO "service_role";



GRANT ALL ON TABLE "public"."research_activities" TO "anon";
GRANT ALL ON TABLE "public"."research_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."research_activities" TO "service_role";



GRANT ALL ON TABLE "public"."research_campaign_recipients" TO "anon";
GRANT ALL ON TABLE "public"."research_campaign_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."research_campaign_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."research_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."research_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."research_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."research_leads" TO "anon";
GRANT ALL ON TABLE "public"."research_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."research_leads" TO "service_role";



GRANT ALL ON TABLE "public"."slots_calendario" TO "anon";
GRANT ALL ON TABLE "public"."slots_calendario" TO "authenticated";
GRANT ALL ON TABLE "public"."slots_calendario" TO "service_role";



GRANT ALL ON TABLE "public"."solicitudes" TO "anon";
GRANT ALL ON TABLE "public"."solicitudes" TO "authenticated";
GRANT ALL ON TABLE "public"."solicitudes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."solicitudes_numero_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."solicitudes_numero_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."solicitudes_numero_seq" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."v_equipo_hoy" TO "anon";
GRANT ALL ON TABLE "public"."v_equipo_hoy" TO "authenticated";
GRANT ALL ON TABLE "public"."v_equipo_hoy" TO "service_role";



GRANT ALL ON TABLE "public"."v_kpis_globales" TO "anon";
GRANT ALL ON TABLE "public"."v_kpis_globales" TO "authenticated";
GRANT ALL ON TABLE "public"."v_kpis_globales" TO "service_role";



GRANT ALL ON TABLE "public"."v_produccion_responsable" TO "anon";
GRANT ALL ON TABLE "public"."v_produccion_responsable" TO "authenticated";
GRANT ALL ON TABLE "public"."v_produccion_responsable" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";



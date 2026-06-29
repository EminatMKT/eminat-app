-- Roles dinámicos: matriz rol→módulos a la DB. Idempotente (re-corre en dev y prod).

-- 1. Tablas
CREATE TABLE IF NOT EXISTS "public"."roles" (
  "key" text PRIMARY KEY,
  "label" text NOT NULL UNIQUE,
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."role_modules" (
  "role_key" text NOT NULL REFERENCES "public"."roles"("key") ON UPDATE CASCADE ON DELETE CASCADE,
  "module_slug" text NOT NULL,
  PRIMARY KEY ("role_key", "module_slug")
);
DROP TRIGGER IF EXISTS "trg_roles_updated_at" ON "public"."roles";
CREATE TRIGGER "trg_roles_updated_at" BEFORE UPDATE ON "public"."roles"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();

-- 2. Seed (8 roles; admin + sin_asignar = is_system). sin_asignar SIN módulos.
INSERT INTO "public"."roles" ("key","label","is_system") VALUES
  ('admin','Administrador',true),
  ('sin_asignar','Sin asignar',true),
  ('stratix360','Stratix 360',false),
  ('finanzas','Finanzas',false),
  ('contabilidad_rrhh','Contabilidad / RRHH',false),
  ('medico','Médico',false),
  ('investigacion','Investigación',false),
  ('medico_investigacion','Médico + Investigación',false)
ON CONFLICT ("key") DO NOTHING;

-- OJO: 'admin' NO lleva filas (su acceso es el short-circuit is_admin()/getModulesForRole;
-- sembrarlas sería data muerta + trampa de mantenimiento). 'sin_asignar' tampoco (cero módulos).
INSERT INTO "public"."role_modules" ("role_key","module_slug") VALUES
  ('stratix360','stratix-mkt'),('stratix360','directorio'),
  ('finanzas','cobranzas'),('finanzas','accounting'),('finanzas','directorio'),
  ('contabilidad_rrhh','accounting'),('contabilidad_rrhh','th-hr'),('contabilidad_rrhh','directorio'),
  ('medico','medical'),('medico','directorio'),
  ('investigacion','research'),('investigacion','directorio'),
  ('medico_investigacion','medical'),('medico_investigacion','research'),('medico_investigacion','directorio')
ON CONFLICT DO NOTHING;

-- 3. Migración legacy (ANTES de la FK)
UPDATE "public"."usuarios" SET "rol"='admin'      WHERE "rol" IN ('superadmin','coordinador');
UPDATE "public"."usuarios" SET "rol"='stratix360' WHERE "rol" IN ('colaborador','pasante');

-- 4. Swap CHECK → FK
ALTER TABLE "public"."usuarios" ALTER COLUMN "rol" SET DEFAULT 'sin_asignar';
ALTER TABLE "public"."usuarios" DROP CONSTRAINT IF EXISTS "usuarios_rol_check";
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='usuarios_rol_fkey') THEN
    ALTER TABLE "public"."usuarios" ADD CONSTRAINT "usuarios_rol_fkey"
      FOREIGN KEY ("rol") REFERENCES "public"."roles"("key") ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

-- 5. Helpers: is_admin() (predicado de admin, reusado) + has_module(slug) que lo compone.
CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.rol = 'admin');
  $$;
CREATE OR REPLACE FUNCTION "public"."has_module"(p_slug text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT public.is_admin() OR EXISTS (
      SELECT 1 FROM public.usuarios u
      JOIN public.role_modules rm ON rm.role_key = u.rol
      WHERE u.auth_id = auth.uid() AND rm.module_slug = p_slug
    );
  $$;

-- 6. RLS de data por módulo: política "mod_access" por tabla, con has_module(slug).
--    Cada fila = tabla|slug|nombre_legacy. Se DROPEA el nombre VIEJO real ("Acceso cobranzas …")
--    + "mod_access" (idempotencia), luego se crea "mod_access". OJO: las policies actuales NO se
--    llaman "mod_access" — si sólo se dropeara ese nombre, las viejas sobrevivirían (acceso = vieja
--    OR nueva) y además el DROP FUNCTION tiene_acceso_* de abajo FALLARÍA por dependencia.
DO $$
DECLARE
  filas text[] := ARRAY[
    'cobranzas_cuentas|cobranzas|Acceso cobranzas cuentas',
    'cobranzas_depositos|cobranzas|Acceso cobranzas depositos',
    'cobranzas_ventas|cobranzas|Acceso cobranzas ventas',
    'research_activities|research|Acceso research activities',
    'research_campaigns|research|Acceso research campaigns',
    'research_leads|research|Acceso research leads',
    'research_campaign_recipients|research|Acceso research recipients'
  ];
  f text; tbl text; slug text; oldname text;
BEGIN
  FOREACH f IN ARRAY filas LOOP
    tbl := split_part(f,'|',1); slug := split_part(f,'|',2); oldname := split_part(f,'|',3);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', oldname, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "mod_access" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "mod_access" ON public.%I USING (public.has_module(%L))', tbl, slug);
  END LOOP;
END $$;

-- Ya nadie referencia las funciones wrapper → borrarlas (verificado: sin .rpc() en el código app)
DROP FUNCTION IF EXISTS "public"."tiene_acceso_cobranzas"();
DROP FUNCTION IF EXISTS "public"."tiene_acceso_research"();

-- 7. Override de admin → is_admin(). Una política "admin_all" por tabla (nombre unificado).
--    Doble DROP (legacy superadmin_* + admin_all) → idempotente, no deja la vieja colgada.
--    NOTA: la policy real en usuarios se llama "superadmin_all_users" (inglés), no
--    "superadmin_all_usuarios" → el patrón %s no la matchea; se dropea explícito abajo.
DROP POLICY IF EXISTS "superadmin_all_users" ON "public"."usuarios";
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['actividades','solicitudes','marcaciones','usuarios'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "superadmin_all" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "superadmin_all_%s" ON public.%I', t, t);  -- legacy _marcaciones
    EXECUTE format('DROP POLICY IF EXISTS "admin_all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "admin_all" ON public.%I USING (public.is_admin())', t);
  END LOOP;
END $$;

-- colaborador_read (actividades) → por módulo stratix-mkt
DROP POLICY IF EXISTS "colaborador_read" ON "public"."actividades";
CREATE POLICY "colaborador_read" ON "public"."actividades" FOR SELECT USING (public.has_module('stratix-mkt'));

-- 8. RLS de tablas nuevas: lectura authenticated; escritura solo service_role
ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."role_modules" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_read" ON "public"."roles";
CREATE POLICY "roles_read" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "role_modules_read" ON "public"."role_modules";
CREATE POLICY "role_modules_read" ON "public"."role_modules" FOR SELECT TO "authenticated" USING (true);
GRANT SELECT ON "public"."roles","public"."role_modules" TO "authenticated";
GRANT ALL ON "public"."roles","public"."role_modules" TO "service_role";

-- 9. Proteger usuarios.rol: solo service_role lo cambia (no rompe online_at/ubicacion)
CREATE OR REPLACE FUNCTION "public"."prevent_rol_self_change"() RETURNS trigger
  LANGUAGE plpgsql AS $$
  BEGIN
    IF NEW.rol IS DISTINCT FROM OLD.rol AND current_user <> 'service_role' THEN
      RAISE EXCEPTION 'usuarios.rol solo se cambia desde la API admin (service_role)';
    END IF;
    RETURN NEW;
  END $$;
DROP TRIGGER IF EXISTS "trg_prevent_rol_self_change" ON "public"."usuarios";
CREATE TRIGGER "trg_prevent_rol_self_change" BEFORE UPDATE ON "public"."usuarios"
  FOR EACH ROW EXECUTE FUNCTION "public"."prevent_rol_self_change"();

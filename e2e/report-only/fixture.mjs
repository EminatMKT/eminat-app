// Test-only dependency: npm install --prefix .tmp/report-sql --no-save --ignore-scripts --no-package-lock @electric-sql/pglite@0.5.13
// Disposable PostgreSQL fixture. No network/database credentials and no production imports.
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
export const ids = {
  company: '99999999-9999-4999-8999-999999999999', foreignCompany: '88888888-8888-4888-8888-888888888888',
  admin: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', adminAuth: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  employee: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', employeeAuth: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  superadmin: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', superadminAuth: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  outsider: '77777777-7777-4777-8777-777777777777', outsiderAuth: '66666666-6666-4666-8666-666666666666',
}
export async function createTaskReportFixture() {
  const { PGlite } = await import(pathToFileURL(path.resolve(process.env.QA_PGLITE_PATH || '.tmp/report-sql/node_modules/@electric-sql/pglite/dist/index.js')).href)
  const db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    CREATE TABLE empresas(id uuid PRIMARY KEY,codigo text,nombre text,color text,activo boolean DEFAULT true,recibe_actividades boolean DEFAULT true);
    CREATE TABLE usuarios(id uuid PRIMARY KEY,auth_id uuid,empresa_id uuid,nombre text,apellido text,nombre_display text,email text,rol text,activo boolean DEFAULT true,validado boolean DEFAULT true,color text,id_sheet text,marca_hora boolean DEFAULT false,equipo_id uuid,online_at timestamptz,ubicacion text,avatar_key text);
    CREATE TABLE roles(key text PRIMARY KEY,label text,is_system boolean);
    CREATE TABLE role_modules(role_key text,module_slug text);
    CREATE TABLE usuario_empresas_acceso(usuario_id uuid,empresa_codigo text);
    CREATE TABLE projects(id uuid PRIMARY KEY,name text,status text,company_code text);
    CREATE TABLE project_members(project_id uuid,user_id uuid,project_role text DEFAULT 'Member');
    CREATE TABLE departamentos(id uuid PRIMARY KEY,nombre text,codigo text);
    CREATE TABLE equipos(id uuid PRIMARY KEY,nombre text,codigo text,departamento_id uuid);
    CREATE TABLE marcaciones(usuario_id uuid,fecha date,hora_entrada time,hora_salida time,horas_trabajadas numeric);
    CREATE TABLE sales_organizations(id uuid PRIMARY KEY,code text,status text);
    CREATE TABLE sales_members(id uuid PRIMARY KEY,user_id uuid,auth_id uuid,organization_id uuid,role text,status text);
    CREATE TABLE actividades(id uuid PRIMARY KEY,titulo text,descripcion text,empresa text,project_id uuid,responsable_id uuid,
      horas numeric,dias_produccion numeric,fecha_inicio date,fecha_entrega date,estado text,
      solicitante_id uuid,created_by_id uuid,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),
      assignment_request_id uuid,mes text,trimestre text,semana text,fecha_requerida date,verificado text,drive_url text,
      aprobado_por_id uuid,fecha_aprobacion date,notas_jefe text,bloqueada boolean,sheet_row integer);
    CREATE TABLE actividad_responsables(actividad_id uuid,usuario_id uuid,es_lider boolean);
    CREATE VIEW v_produccion_responsable AS SELECT count(*) AS total_tareas FROM actividades;
    CREATE VIEW v_kpis_globales AS SELECT count(*) AS total_tareas FROM actividades;
    CREATE FUNCTION has_module(p_slug text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT EXISTS(SELECT 1 FROM usuarios u WHERE u.auth_id=auth.uid() AND u.activo
        AND (u.rol='admin' OR EXISTS(SELECT 1 FROM role_modules rm WHERE rm.role_key=u.rol AND rm.module_slug=p_slug))) $$;
    CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM usuarios u WHERE u.auth_id=auth.uid() AND u.activo AND u.rol='admin') $$;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT INSERT,UPDATE,DELETE ON actividades TO authenticated;
    ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;
    CREATE POLICY lilly_activities_read ON actividades FOR SELECT TO authenticated USING(true);
    CREATE POLICY fixture_update ON actividades FOR UPDATE TO authenticated USING(true) WITH CHECK(true);
    CREATE POLICY fixture_insert ON actividades FOR INSERT TO authenticated WITH CHECK(true);
  `)
  const people = [
    { id: ids.superadmin, auth_id: ids.superadminAuth, nombre: 'Sam', apellido: 'Superadmin QA', email: 'superadmin-review@example.invalid', rol: 'admin', company: ids.company },
    { id: ids.admin, auth_id: ids.adminAuth, nombre: 'Alex', apellido: 'Admin QA', email: 'admin-review@example.invalid', rol: 'admin', company: ids.company },
    { id: ids.employee, auth_id: ids.employeeAuth, nombre: 'Ada', apellido: 'Employee QA', email: 'employee-review@example.invalid', rol: 'stratix360', company: ids.company },
    { id: ids.outsider, auth_id: ids.outsiderAuth, nombre: 'Foreign', apellido: 'Employee QA', email: 'foreign-review@example.invalid', rol: 'stratix360', company: ids.foreignCompany },
  ]
  await db.query('INSERT INTO empresas(id,codigo,nombre,color) VALUES ($1,\'S\',\'Stratix QA\',\'#5046e5\'),($2,\'EMC\',\'Foreign QA\',\'#888888\')',[ids.company,ids.foreignCompany])
  await db.exec("INSERT INTO roles VALUES ('admin','ADMIN · QA',true),('stratix360','Stratix employee · QA',false); INSERT INTO role_modules VALUES ('stratix360','tasks'),('stratix360','stratix-mkt');")
  for (const p of people) await db.query('INSERT INTO usuarios(id,auth_id,empresa_id,nombre,apellido,nombre_display,email,rol) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[p.id,p.auth_id,p.company,p.nombre,p.apellido,p.nombre+' '+p.apellido,p.email,p.rol])
  await db.exec("INSERT INTO sales_organizations VALUES ('11111111-aaaa-4aaa-8aaa-111111111111','stratix','active'),('22222222-aaaa-4aaa-8aaa-222222222222','emc','active');")
  await db.query("INSERT INTO sales_members VALUES ('33333333-aaaa-4aaa-8aaa-333333333333',$1,$2,'11111111-aaaa-4aaa-8aaa-111111111111','SUPERADMIN','active'),('44444444-aaaa-4aaa-8aaa-444444444444',$3,$4,'22222222-aaaa-4aaa-8aaa-222222222222','SUPERADMIN','active')",[ids.superadmin,ids.superadminAuth,ids.outsider,ids.outsiderAuth])
  for (let index=0;index<people.length;index++) {
    const person=people[index]
    for (let item=0;item<2;item++) {
      const id=`${index+1}${item+1}000000-1111-4111-8111-111111111111`
      await db.query('INSERT INTO actividades(id,titulo,descripcion,empresa,horas,dias_produccion,fecha_inicio,fecha_entrega,estado,solicitante_id,created_by_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)',[
        id,item ? 'Revisión y entrega de materiales' : 'Diseño de piezas para campaña',
        item ? 'Validación de textos, ajustes visuales y organización de archivos finales.' : 'Preparación de artes y revisión de colores de marca.\nAdaptación de diseños para canales digitales.',
        person.company===ids.company?'S':'EMC',item?2:7.5,1,`2026-10-${item?21:10}`,`2026-10-${item?28:20}`,item?'En proceso':'Completado',person.id,
      ])
      await db.query('INSERT INTO actividad_responsables VALUES ($1,$2,true)',[id,person.id])
    }
  }
  // Execute the existing production-baseline read policies, never the excluded migration.
  const foundation = await readFile('supabase/migrations/20261005090000_lilly_access_foundation.sql','utf8')
  await db.exec(`CREATE TABLE lilly_access_control(singleton boolean,enforced boolean); INSERT INTO lilly_access_control VALUES(true,true);`)
  for (const functionName of ['lilly_access_enforced','lilly_has_company','lilly_project_member','lilly_can_see_activity','lilly_can_see_user']) {
    const start=foundation.indexOf('CREATE FUNCTION public.'+functionName+'(')
    const end=foundation.indexOf('$$;', start)+3
    await db.exec(foundation.slice(start,end))
  }
  for (const p of people) await db.query('INSERT INTO usuario_empresas_acceso VALUES ($1,$2)',[p.id,p.company===ids.company?'S':'EMC'])
  const policies=await readFile('supabase/migrations/20261005090100_lilly_access_policies.sql','utf8')
  await db.exec('DROP POLICY lilly_activities_read ON actividades')
  const start=policies.indexOf('CREATE POLICY lilly_activities_read ')
  await db.exec(policies.slice(start,policies.indexOf(';',start)+1))
  await db.exec('REVOKE ALL ON sales_members,sales_organizations FROM authenticated,anon; GRANT SELECT ON sales_members,sales_organizations TO service_role;')

  async function asUser(authId,sql,params=[]) {
    return db.transaction(async tx => {
      await tx.exec('SET LOCAL ROLE authenticated')
      await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[authId])
      return tx.query(sql,params)
    })
  }
  return { db, people: people.map(p=>({...p,activo:true,validado:true})), asUser }
}

# Roles dinámicos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover la matriz rol→módulos de código (`shared/auth/permissions.ts`) a la DB (`roles` + `role_modules`), con una pantalla en /admin para que el admin cree roles y asigne módulos; menú, AccessDenied y RLS quedan DB-driven.

**Architecture:** Migración SQL crea `roles`/`role_modules`, migra legacy, swap CHECK→FK, reconcilia RLS con `role_modules` vía `has_module(slug)`, y protege `usuarios.rol` con un trigger. `permissions.ts` pasa a helpers puros sobre un mapa cargado en `AppContext`. UI de roles + rutas API con authz de admin.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (Postgres + RLS), Supabase CLI (migraciones SQL), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-23-dynamic-roles-design.md` (leer antes de empezar).

## Global Constraints

- **Rama:** `feature/dynamic-roles` (ya creada desde `development`).
- **`ADMIN_ROLE = 'admin'`**, **`DEFAULT_ROLE = 'sin_asignar'`** (constantes en código).
- **Módulos = code-defined** (`ALL_MODULES`): `stratix-mkt, cobranzas, research, medical, accounting, th-hr, directorio, admin`. No se crea tabla `modules`.
- **Migraciones = SQL** vía `pnpm supabase migration new` (NO ORM). Aplicar a dev (`ydcadspinryybextlvyi`) y luego prod (`ruedelunbtaomhrzgelc`) con `link` + `db push`.
- **`Role = string`** (las keys son datos dinámicos).
- **Tests:** `pnpm test` (vitest). Typecheck: `pnpm exec tsc --noEmit`.
- **Convención FK:** clave natural → nombre natural (`usuarios.rol`, no `rol_id`).
- **Imports:** relativo intra-feature, alias `@/` cross-módulo.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `supabase/migrations/<ts>_dynamic_roles.sql` | Esquema, seed, legacy, FK, RLS, triggers | Crear |
| `shared/auth/permissions.ts` | Tipos + helpers puros (map-driven) + catálogo de módulos | Reescribir |
| `shared/auth/roleValidation.ts` | `slugifyRoleKey`, `validateNewRole`, `validateModuleSlugs`, `isLastAdmin` (puros) | Crear |
| `shared/data/roles.ts` | Repo lectura `listRoles`/`listRoleModules` | Crear |
| `shared/data/tables.ts` | + `roles`, `roleModules` | Modificar |
| `shared/data/index.ts` | + `rolesRepo` | Modificar |
| `shared/context/useAppData.ts` | estado `roles`/`roleModuleMap` | Modificar |
| `shared/context/loadAppData.ts` | cargar roles + construir mapa | Modificar |
| `shared/context/AppContext.tsx` | derivar desde el mapa; exponer `roles`/`roleModuleMap` | Modificar |
| `shared/components/AppShell.tsx` | sidebar desde `modules.includes` | Modificar |
| `middleware.ts` | gate de sesión solamente | Reescribir |
| `shared/db/supabaseAdmin.ts` | factory del cliente service_role (reusable por rutas admin) | Crear |
| `shared/db/requireAdmin.ts` | authz server-side de admin (lee sesión) | Crear |
| `shared/api.ts` | helper HTTP genérico `apiPost`/`apiSend` (movido desde `features/admin/api.ts`) | Crear (mover) |
| `features/admin/{components,hooks}/*` (7 imports de `../api`) | actualizar import → `@/shared/api` | Modificar |
| `features/admin/components/{RoleChip,RoleFilterBar,UserRow,CreateUserModal,EditUserModal}.tsx` | dropdowns/chips desde `roles` | Modificar |
| `features/admin/hooks/useUserActions.ts` | `cambiarRol` rutea por API | Modificar |
| `app/api/admin/create-user/route.ts` | default `DEFAULT_ROLE`; label del email desde DB | Modificar |
| `app/api/admin/update-user/route.ts` | `requireAdmin` + guard último admin | Modificar |
| `app/api/admin/delete-user/route.ts`, `reassign-and-delete/route.ts` | `requireAdmin` + guard último admin | Modificar |
| `app/api/admin/roles/route.ts` | GET (list) / POST (create) | Crear |
| `app/api/admin/roles/[key]/route.ts` | PATCH (label/módulos) / DELETE | Crear |
| `features/admin/components/RolesManager.tsx`, `CreateRoleModal.tsx` | UI de gestión de roles | Crear |
| `features/admin/components/AdminModule.tsx` | toggle Usuarios/Roles | Modificar |
| `CLAUDE.md` | sección Roles + path permissions | Modificar |

---

## Task 1: Migración SQL `dynamic_roles`

**Files:**
- Create: `supabase/migrations/<timestamp>_dynamic_roles.sql`

**Interfaces:**
- Produces (DB): tablas `roles(key,label,is_system,created_at,updated_at)`, `role_modules(role_key,module_slug)`; funciones `is_admin()`, `has_module(text)` (las wrapper `tiene_acceso_cobranzas/research` se **eliminan**); trigger `prevent_rol_self_change`; FK `usuarios_rol_fkey`; columna `usuarios.rol` default `'sin_asignar'`.

- [ ] **Step 1: Crear el archivo de migración (CLI genera el timestamp)**

Run: `pnpm supabase migration new dynamic_roles`
Expected: imprime `Created new migration at supabase/migrations/<ts>_dynamic_roles.sql`.

- [ ] **Step 2: Escribir el SQL completo** en ese archivo:

```sql
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

-- Ya nadie referencia las funciones wrapper → borrarlas (verificar antes que no haya .rpc() en el código app)
DROP FUNCTION IF EXISTS "public"."tiene_acceso_cobranzas"();
DROP FUNCTION IF EXISTS "public"."tiene_acceso_research"();

-- 7. Override de admin → is_admin(). Una política "admin_all" por tabla (nombre unificado).
--    Doble DROP (legacy superadmin_* + admin_all) → idempotente, no deja la vieja colgada.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['actividades','solicitudes','marcaciones','usuarios'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "superadmin_all" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "superadmin_all_%s" ON public.%I', t, t);  -- legacy _marcaciones/_users
    EXECUTE format('DROP POLICY IF EXISTS "admin_all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "admin_all" ON public.%I USING (public.is_admin())', t);
  END LOOP;
END $$;

-- colaborador_read (actividades) → por módulo stratix-mkt
DROP POLICY IF EXISTS "colaborador_read" ON "public"."actividades";
CREATE POLICY "colaborador_read" ON "public"."actividades" FOR SELECT USING (public.has_module('stratix-mkt'));

-- 7. RLS de tablas nuevas: lectura authenticated; escritura solo service_role
ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."role_modules" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_read" ON "public"."roles";
CREATE POLICY "roles_read" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "role_modules_read" ON "public"."role_modules";
CREATE POLICY "role_modules_read" ON "public"."role_modules" FOR SELECT TO "authenticated" USING (true);
GRANT SELECT ON "public"."roles","public"."role_modules" TO "authenticated";
GRANT ALL ON "public"."roles","public"."role_modules" TO "service_role";

-- 8. Proteger usuarios.rol: solo service_role lo cambia (no rompe online_at/ubicacion)
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
```

- [ ] **Step 3: Pre-flight LOCAL (no tocar el dev remoto todavía)**

La DB de dev (`ydcadspinryybextlvyi`) es **compartida** por todas las ramas. No probar contra ella:
validar primero en un Postgres local desechable.
```bash
pnpm supabase start                 # levanta Postgres+Auth+Studio local (Docker)
pnpm supabase db reset              # re-aplica TODAS las migraciones desde cero, incluida ésta
```
Expected: `db reset` corre la migración sin error. Iterar acá las veces que haga falta — `db reset`
**es el rollback**: blast-radius cero, redo infinito. Correr las verificaciones del Step 5 contra local
(Studio en `http://127.0.0.1:54323` o `psql` al puerto local) antes de seguir.

- [ ] **Step 4: Backup de dev + push remoto**

Solo cuando local está verde. **Antes** de mutar el dev compartido, respaldar lo irrecuperable
(`usuarios.rol`; el esquema ya está en git):
```bash
pnpm supabase link --project-ref ydcadspinryybextlvyi
pnpm supabase db dump --data-only -f backup-dev-$(date +%F).sql   # respaldo de datos (rol incluido)
pnpm supabase db push                                             # aplica la migración a dev
```
Expected: aplica sin error.

> **Contingencia / rollback**
> - **Local:** `supabase db reset` → vuelve a cero. No hace falta down-migration.
> - **Remoto (dev):** si aplicó pero quedó mal, restaurar desde el dump (`psql < backup-dev-….sql`)
>   o re-seed de `usuarios.rol`. El esquema se recupera de git.
> - El DDL de Postgres es **transaccional**: un fallo a mitad de la migración **auto-revierte** el archivo
>   entero. La migración además es idempotente (DROP IF EXISTS / OR REPLACE / guards), re-aplicable.
> - **No** se escribe una down-migration "perfecta" a mano: reconstruir funciones/policies dropeadas es
>   más frágil que restaurar del dump (ver Decisiones).

- [ ] **Step 5: Verificar el estado en dev (SQL editor o psql)**

Verificar manualmente:
- `SELECT key,is_system FROM roles ORDER BY key;` → 8 filas; `admin` y `sin_asignar` con is_system=true.
- `SELECT count(*) FROM role_modules WHERE role_key='sin_asignar';` → 0.
- `SELECT DISTINCT rol FROM usuarios;` → solo keys del set nuevo (sin superadmin/colaborador/pasante/coordinador).
- `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='usuarios_rol_fkey';` → FK a roles(key).

- [ ] **Step 5b: Remediar acceso por email legacy (CRÍTICO — pérdida de acceso si se omite)**

Las funciones borradas (`tiene_acceso_*`) concedían acceso por **email**, no solo por rol:
`cobranzas` → `majo@eminat.net`, `freddy@eminat.net`; `research` → `freddy@eminat.net`, `jonathan@eminat.net`.
Tras la migración el acceso es solo `has_module(slug)`. Freddy = admin (short-circuit, OK), pero **majo**
y **jonathan** pierden acceso salvo que su rol tenga el módulo. Verificar:
```sql
SELECT email, rol FROM usuarios WHERE email IN ('majo@eminat.net','jonathan@eminat.net');
```
**Camino principal (por la UI, una vez la feature está viva — Task 9):** crear roles a medida con
**exactamente** los módulos que cada uno necesita (su excepción-por-email pasa a ser un rol propio):
- Rol "Cobranzas" = `{cobranzas}` (+`directorio` si se quiere) → asignar a majo.
- Rol "Research" = `{research}` (+`directorio`) → asignar a jonathan.

Esto preserva el acceso exacto sin sobre-otorgar (no reusar `finanzas`/`investigacion`, que dan módulos de más).
Asignación: dropdown de rol en la fila del usuario en /admin.
> Plan B (durante la migración misma, sin UI todavía): `UPDATE usuarios SET rol='...' WHERE email='...'`
> como **service_role** (el SQL editor de Supabase lo es; el trigger bloquea otros clientes).

- [ ] **Step 6: Verificar el trigger anti auto-escalada (manual, como usuario authenticated)**

Con un usuario NO admin (token authenticated), intentar `UPDATE usuarios SET rol='admin' WHERE auth_id=auth.uid()` → debe **fallar** con la excepción. Un `UPDATE usuarios SET ubicacion='X'` del mismo usuario → debe **pasar** (no toca rol).
> Si `current_user` no diera `'service_role'` en este entorno, ajustar el chequeo a `auth.role() <> 'service_role'` y re-verificar.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(roles): migración dynamic_roles (tablas, seed, FK, RLS por módulo, trigger)"
```

---

## Task 2: Reescribir `permissions.ts` (helpers puros + tipos)

**Files:**
- Modify: `shared/auth/permissions.ts`
- Test: `shared/auth/permissions.test.ts`

**Interfaces:**
- Produces: `type Role = string`; `type ModuleSlug`; `type RoleModuleMap = Record<string, ModuleSlug[]>`; `type RoleRow = { key: string; label: string; is_system: boolean }`; `ADMIN_ROLE='admin'`; `DEFAULT_ROLE='sin_asignar'`; `ALL_MODULES`; `isModuleSlug(v)`; `MODULE_META`; `moduleForPath(path)`; `normalizeRole(raw): Role|null`; `getModulesForRole(map, role): ModuleSlug[]` (admin → `ALL_MODULES`, null/desconocido → `[]`). **No** hay `canAccess` — la pertenencia es `getModulesForRole(...).includes(slug)`.

- [ ] **Step 1: Escribir los tests**

Crear `shared/auth/permissions.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  getModulesForRole, normalizeRole, moduleForPath, isModuleSlug,
  ADMIN_ROLE, DEFAULT_ROLE, ALL_MODULES, type RoleModuleMap,
} from './permissions'

const MAP: RoleModuleMap = { stratix360: ['stratix-mkt', 'directorio'], finanzas: ['cobranzas'] }

describe('getModulesForRole', () => {
  it('devuelve los módulos del rol', () => {
    expect(getModulesForRole(MAP, 'stratix360')).toEqual(['stratix-mkt', 'directorio'])
  })
  it('rol desconocido → []', () => { expect(getModulesForRole(MAP, 'nope')).toEqual([]) })
  it('null → []', () => { expect(getModulesForRole(MAP, null)).toEqual([]) })
  it('admin → ALL_MODULES (short-circuit, aun con mapa vacío)', () => {
    expect(getModulesForRole({}, ADMIN_ROLE).sort()).toEqual([...ALL_MODULES].sort())
  })
})

// (no hay canAccess: la pertenencia se chequea con `getModulesForRole(...).includes(slug)`,
//  método nativo; ModuleSlug ya tipa el slug. Cubierto por los casos de getModulesForRole.)

describe('normalizeRole', () => {
  it('mapea legacy', () => {
    expect(normalizeRole('superadmin')).toBe('admin')
    expect(normalizeRole('pasante')).toBe('stratix360')
  })
  it('pasa keys dinámicas tal cual', () => { expect(normalizeRole('soporte')).toBe('soporte') })
  it('no-string o vacío → null', () => {
    expect(normalizeRole(null)).toBeNull(); expect(normalizeRole('')).toBeNull()
  })
})

describe('moduleForPath', () => {
  it('mapea ruta a slug', () => { expect(moduleForPath('/cobranzas/x')).toBe('cobranzas') })
  it('overview → admin', () => { expect(moduleForPath('/overview')).toBe('admin') })
  it('ruta no gateada → null', () => { expect(moduleForPath('/login')).toBeNull() })
})

describe('constantes', () => {
  it('ADMIN_ROLE y DEFAULT_ROLE', () => {
    expect(ADMIN_ROLE).toBe('admin'); expect(DEFAULT_ROLE).toBe('sin_asignar')
  })
  it('isModuleSlug', () => { expect(isModuleSlug('cobranzas')).toBe(true); expect(isModuleSlug('x')).toBe(false) })
  // candado: agregar/quitar un módulo debe ser un cambio consciente (literales = oráculo independiente)
  it('ALL_MODULES = set canónico', () => {
    expect([...ALL_MODULES].sort()).toEqual(
      ['accounting','admin','cobranzas','directorio','medical','research','stratix-mkt','th-hr'].sort()
    )
  })
})
```

- [ ] **Step 2: Correr el test (falla)**

Run: `pnpm test shared/auth/permissions.test.ts`
Expected: FAIL (imports/firmas no existen aún).

- [ ] **Step 3: Reescribir `shared/auth/permissions.ts`**

Reemplazar el contenido relacionado con roles. Mantener `ModuleSlug`, `ALL_MODULES`, `MODULE_META`, `moduleForPath` (pero `moduleForPath` deriva el prefijo). Cambios clave:
```ts
export type Role = string
export type RoleModuleMap = Record<string, ModuleSlug[]>
export type RoleRow = { key: string; label: string; is_system: boolean }
export const ADMIN_ROLE = 'admin'
export const DEFAULT_ROLE = 'sin_asignar'

// ModuleSlug, isModuleSlug, MODULE_META se mantienen. ALL_MODULES pasa a DERIVARSE de
// MODULE_META (no más lista a mano; agregar un módulo = una entrada en MODULE_META).
// IMPORTANTE: declarar ALL_MODULES DESPUÉS de MODULE_META (lo referencia):
export const ALL_MODULES = Object.keys(MODULE_META) as ModuleSlug[]

const LEGACY_TO_NEW: Record<string, Role> = {
  superadmin: 'admin', coordinador: 'admin', colaborador: 'stratix360', pasante: 'stratix360',
}
export function normalizeRole(raw: unknown): Role | null {
  if (typeof raw !== 'string' || !raw) return null
  return LEGACY_TO_NEW[raw] ?? raw
}

export function getModulesForRole(map: RoleModuleMap, role: Role | null): ModuleSlug[] {
  if (!role) return []
  if (role === ADMIN_ROLE) return [...ALL_MODULES]  // short-circuit: admin ve todo
  return map[role] ?? []
}
// (sin canAccess: los consumidores usan `getModulesForRole(map, role).includes(slug)`)

// moduleForPath: derivar el prefijo de cada slug ('/'+slug); borrar MODULE_PATH_PREFIX.
export function moduleForPath(pathname: string): ModuleSlug | null {
  if (pathname === '/overview' || pathname.startsWith('/overview/')) return 'admin'
  const entries = ALL_MODULES.map((slug) => [slug, '/' + slug] as const)
    .sort((a, b) => b[1].length - a[1].length)
  for (const [slug, prefix] of entries) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return slug
  }
  return null
}
```
Borrar: `ROLES`, `PERMISSIONS`, `ROLE_LABELS`, `MODULE_PATH_PREFIX`, `isRole`, `canAccess` (entera), y el viejo `getModulesForRole` de 2 args.

- [ ] **Step 4: Correr el test (pasa)**

Run: `pnpm test shared/auth/permissions.test.ts`
Expected: PASS. (typecheck va a romper en consumidores — se arregla en tasks siguientes.)

- [ ] **Step 5: Commit**

```bash
git add shared/auth/permissions.ts shared/auth/permissions.test.ts
git commit -m "feat(roles): permissions.ts map-driven (Role=string, helpers puros, admin short-circuit)"
```

---

## Task 3: Helpers de validación de roles (puros)

**Files:**
- Create: `shared/auth/roleValidation.ts`
- Test: `shared/auth/roleValidation.test.ts`

**Interfaces:**
- Produces: `slugifyRoleKey(label: string): string`; `RESERVED_ROLE_KEYS: Set<string>` (`{admin, todos}`); `validateNewRole(label, existing: RoleRow[]): { ok: true, key: string } | { ok: false, error: string }`; `validateModuleSlugs(slugs: string[]): { ok: true } | { ok: false, error: string }`; `isLastAdmin(users: { id: string; rol: string }[], targetId: string): boolean` — true si quitar/degradar a `targetId` dejaría 0 admins.

- [ ] **Step 1: Escribir los tests**

Crear `shared/auth/roleValidation.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { slugifyRoleKey, validateNewRole, validateModuleSlugs } from './roleValidation'
import type { RoleRow } from './permissions'

describe('slugifyRoleKey', () => {
  it('minúsculas + diacríticos + separador', () => {
    expect(slugifyRoleKey('Investigación')).toBe('investigacion')
    expect(slugifyRoleKey('Contabilidad / RRHH')).toBe('contabilidad_rrhh')
    expect(slugifyRoleKey('Médico')).toBe('medico')
  })
  it('fallback si queda vacío', () => { expect(slugifyRoleKey('🎉')).toMatch(/^rol_/) })
  it('resultado matchea ^[a-z][a-z0-9_]*$', () => {
    expect(slugifyRoleKey('Soporte 24/7')).toMatch(/^[a-z][a-z0-9_]*$/)
  })
})

const EXISTING: RoleRow[] = [{ key: 'admin', label: 'Administrador', is_system: true }]

describe('validateNewRole', () => {
  it('ok genera key del label', () => {
    const r = validateNewRole('Soporte', EXISTING)
    expect(r).toEqual({ ok: true, key: 'soporte' })
  })
  it('label duplicado → error', () => {
    expect(validateNewRole('Administrador', EXISTING).ok).toBe(false)
  })
  it('key reservada → error', () => {
    expect(validateNewRole('Todos', EXISTING).ok).toBe(false)
    expect(validateNewRole('Admin', EXISTING).ok).toBe(false)
  })
  it('key duplicada → dedupe con sufijo', () => {
    const ex: RoleRow[] = [{ key: 'soporte', label: 'Soporte viejo', is_system: false }]
    const r = validateNewRole('Soporte', ex)
    expect(r.ok && r.key).toBe('soporte_2')
  })
  it('label vacío → error', () => { expect(validateNewRole('  ', EXISTING).ok).toBe(false) })
})

describe('validateModuleSlugs', () => {
  it('todos válidos → ok', () => { expect(validateModuleSlugs(['cobranzas', 'directorio']).ok).toBe(true) })
  it('uno inválido → error', () => { expect(validateModuleSlugs(['cobranzas', 'fake']).ok).toBe(false) })
})
```

- [ ] **Step 2: Correr (falla)** — Run: `pnpm test shared/auth/roleValidation.test.ts` → FAIL.

- [ ] **Step 3: Implementar `shared/auth/roleValidation.ts`**

```ts
import { ALL_MODULES, isModuleSlug, type RoleRow } from './permissions'

export const RESERVED_ROLE_KEYS = new Set(['admin', 'todos'])

export function slugifyRoleKey(label: string): string {
  const base = label.normalize('NFD').replace(/[̀-ͯ]/g, '') // diacríticos
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return /^[a-z]/.test(base) ? base : `rol_${base || Math.abs(hash(label))}`
}
function hash(s: string): number { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h }

type RoleResult = { ok: true; key: string } | { ok: false; error: string }

export function validateNewRole(label: string, existing: RoleRow[]): RoleResult {
  const trimmed = label.trim()
  if (!trimmed) return { ok: false, error: 'El nombre del rol es obligatorio.' }
  if (existing.some((r) => r.label.toLowerCase() === trimmed.toLowerCase()))
    return { ok: false, error: 'Ya existe un rol con ese nombre.' }
  let key = slugifyRoleKey(trimmed)
  if (RESERVED_ROLE_KEYS.has(key)) return { ok: false, error: 'Ese nombre está reservado por el sistema.' }
  const taken = new Set(existing.map((r) => r.key))
  if (taken.has(key)) { let n = 2; while (taken.has(`${key}_${n}`)) n++; key = `${key}_${n}` }
  return { ok: true, key }
}

export function validateModuleSlugs(slugs: string[]): { ok: true } | { ok: false; error: string } {
  const bad = slugs.filter((s) => !isModuleSlug(s))
  return bad.length ? { ok: false, error: `Módulos inválidos: ${bad.join(', ')}` } : { ok: true }
}

// ¿quitar/degradar a este usuario dejaría 0 admins?
export function isLastAdmin(users: { id: string; rol: string }[], targetId: string): boolean {
  const admins = users.filter((u) => u.rol === 'admin')
  return admins.length === 1 && admins[0].id === targetId
}
```

- [ ] **Step 4: Correr (pasa)** — Run: `pnpm test shared/auth/roleValidation.test.ts` → PASS.

- [ ] **Step 5: Commit**
```bash
git add shared/auth/roleValidation.ts shared/auth/roleValidation.test.ts
git commit -m "feat(roles): validación pura (slugify, validateNewRole, validateModuleSlugs, isLastAdmin)"
```

---

## Task 4: Repo de datos `roles`

**Files:**
- Create: `shared/data/roles.ts`
- Modify: `shared/data/tables.ts`, `shared/data/index.ts`

**Interfaces:**
- Produces: `rolesRepo.listRoles()` → `{ data: RoleRow[] }`; `rolesRepo.listRoleModules()` → `{ data: {role_key,module_slug}[] }`. `TABLES.roles='roles'`, `TABLES.roleModules='role_modules'`.

- [ ] **Step 1: `tables.ts`** — agregar dentro de `TABLES`:
```ts
  roles: 'roles',
  roleModules: 'role_modules',
```

- [ ] **Step 2: Crear `shared/data/roles.ts`**
```ts
import { supabase } from '@/shared/db/supabase'
import { TABLES } from './tables'

export const listRoles = () =>
  supabase.from(TABLES.roles).select('*').order('label', { ascending: true })

export const listRoleModules = () =>
  supabase.from(TABLES.roleModules).select('*')
```

- [ ] **Step 3: `index.ts`** — agregar: `export * as rolesRepo from './roles'`

- [ ] **Step 4: Typecheck** — Run: `pnpm exec tsc --noEmit` (esperado: sin errores nuevos en estos archivos).

- [ ] **Step 5: Commit**
```bash
git add shared/data/roles.ts shared/data/tables.ts shared/data/index.ts
git commit -m "feat(roles): repo de lectura shared/data/roles"
```

---

## Task 5: Cargar roles en el contexto

**Files:**
- Modify: `shared/context/useAppData.ts`, `shared/context/loadAppData.ts`, `shared/context/AppContext.tsx`

**Interfaces:**
- Consumes: `rolesRepo` (Task 4); `getModulesForRole`/`normalizeRole`/`ADMIN_ROLE`/`RoleRow`/`RoleModuleMap` (Task 2).
- Produces (contexto `useApp()`): `roles: RoleRow[]`, `roleModuleMap: RoleModuleMap`, `role: Role|null`, `modules: ModuleSlug[]`, `esAdmin: boolean`, `cargo: string`. (Sin `canCobranzas/canResearch/canMedical` — cada módulo se auto-gatea con `modules.includes('<slug>')`.)

- [ ] **Step 1: `useAppData.ts`** — agregar import y estado:
```ts
import type { RoleRow, RoleModuleMap } from '@/shared/auth/permissions'
// dentro del hook:
const [roles, setRoles] = useState<RoleRow[]>([])
const [roleModuleMap, setRoleModuleMap] = useState<RoleModuleMap>({})
```
Pasar `setRoles, setRoleModuleMap` al `startAppData({...})` y devolver `roles, setRoles, roleModuleMap, setRoleModuleMap` en el return.

- [ ] **Step 2: `loadAppData.ts`** — agregar al tipo `Setters`: `setRoles: (r: RoleRow[]) => void` y `setRoleModuleMap: (m: RoleModuleMap) => void`. Importar `rolesRepo` y los tipos. Tras `s.setUsuario(usr)`:
```ts
const [{ data: roleRows }, { data: roleMods }] = await Promise.all([
  rolesRepo.listRoles(), rolesRepo.listRoleModules(),
])
s.setRoles((roleRows as RoleRow[]) || [])
const map: RoleModuleMap = {}
for (const rm of (roleMods || []) as { role_key: string; module_slug: ModuleSlug }[]) {
  ;(map[rm.role_key] ??= []).push(rm.module_slug)
}
s.setRoleModuleMap(map)
```
(importar `ModuleSlug` de permissions).

- [ ] **Step 3: `AppContext.tsx`** — cambiar imports a `getModulesForRole, normalizeRole, ADMIN_ROLE, type Role, type ModuleSlug, type RoleRow, type RoleModuleMap`. Borrar el re-export `export const ROLES = ...`. En `AppContextType`: agregar `roles: RoleRow[]; roleModuleMap: RoleModuleMap;` y **borrar** `canCobranzas/canResearch/canMedical`. Reemplazar la derivación:
```ts
const role: Role | null = normalizeRole(app.usuario?.rol)
const modules: ModuleSlug[] = getModulesForRole(app.roleModuleMap, role)
const esAdmin = role === ADMIN_ROLE
const cargo = app.roles.find(r => r.key === role)?.label || app.usuario?.rol || 'Sin asignar'
```
Borrar del value las props `canCobranzas/canResearch/canMedical`. Renombrar la prop expuesta `esSuperAdmin` → `esAdmin` en el value y el type. (`roles`/`roleModuleMap`/`modules` ya se exponen; `roles`/`roleModuleMap` entran por `...app`.)

- [ ] **Step 4: `loadAppData.ts`** — renombrar la variable local `isSuperAdmin` → `isAdmin` (cosmético, consistencia).

- [ ] **Step 5: Typecheck** — Run: `pnpm exec tsc --noEmit`
Expected: errores SOLO en consumidores de `esSuperAdmin`/`ROLES` (se arreglan en Task 6). Confirmar que no hay errores en context/loadAppData/useAppData.

- [ ] **Step 6: Commit**
```bash
git add shared/context/
git commit -m "feat(roles): cargar roles+role_modules en AppContext; derivar permisos del mapa"
```

---

## Task 6: Consumidores (AppShell, middleware, componentes admin, create-user)

**Files:**
- Modify: `shared/components/AppShell.tsx`, `middleware.ts`, `features/admin/components/{RoleChip,RoleFilterBar,UserRow,CreateUserModal,EditUserModal,AdminModule}.tsx`, `app/api/admin/create-user/route.ts`, `features/cobranzas/components/CobranzasModule.tsx`, `features/cobranzas/hooks/useCobranzasData.ts`, `features/research/components/ResearchModule.tsx`, `features/medical/components/MedicalModule.tsx`

**Interfaces:**
- Consumes: `useApp().{modules, roles, esAdmin}`; `DEFAULT_ROLE`, `ADMIN_ROLE`, `normalizeRole` (Task 2).

- [ ] **Step 1: `AppShell.tsx`** — borrar `import { canAccess }`. Destructurar `modules` (en vez de `role`) de `app`. Reemplazar el `sidebarIcons` hardcodeado (un `if` por módulo) por una config tipada filtrada por `modules`. Home siempre va; los que abren submenú llevan un flag:
```tsx
import type { ModuleSlug } from '@/shared/auth/permissions'
// fuera del componente:
const NAV: { slug: ModuleSlug; key: string; icon: string; label: string; panel?: 'mkt'|'medical'|'research' }[] = [
  { slug: 'stratix-mkt', key: 'mkt', icon: '🚀', label: 'Stratix 360', panel: 'mkt' },
  { slug: 'accounting', key: 'accounting', icon: '🧾', label: 'Accounting' },
  { slug: 'cobranzas', key: 'cobranzas', icon: '💳', label: 'Billing' },
  { slug: 'medical', key: 'medical', icon: '🏥', label: 'Medical', panel: 'medical' },
  { slug: 'th-hr', key: 'th-hr', icon: '👤', label: 'TH/HR' },
  { slug: 'research', key: 'research', icon: '🔬', label: 'Research', panel: 'research' },
  { slug: 'directorio', key: 'directorio', icon: '🏢', label: 'Directory' },
  { slug: 'admin', key: 'admin', icon: '🔐', label: 'Admin' },
]
// dentro del componente:
const navItems = (slug: ModuleSlug, panel?: string) => panel
  ? () => { setSidebarPanel(p => p === panel ? null : panel); if (!pathname.startsWith('/' + slug)) router.push('/' + slug) }
  : () => { router.push('/' + slug); setSidebarPanel(null) }
const sidebarIcons: any[] = [
  { key: 'home', icon: '🏠', label: 'Home', action: () => { router.push('/'); setSidebarPanel(null) } },
  ...NAV.filter(i => modules.includes(i.slug)).map(i => ({ key: i.key, icon: i.icon, label: i.label, action: navItems(i.slug, i.panel) })),
]
```
(El slug aparece una vez por ítem, como dato tipado; el gating es el `.filter`.)

- [ ] **Step 2: `middleware.ts`** — reemplazar por gate de sesión solamente (borra el bloque de módulos/JWT, que hoy es dead-code fail-open):
```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
  const { pathname } = request.nextUrl
  if (!hasSession && pathname !== '/login') return NextResponse.redirect(new URL('/login', request.url))
  if (hasSession && pathname === '/login') return NextResponse.redirect(new URL('/', request.url))
  return NextResponse.next()
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }
```

- [ ] **Step 3: `RoleChip.tsx`** — agregar prop opcional `label?: string`, render `{label ?? role}`.

- [ ] **Step 4: `RoleFilterBar.tsx`** — `import { useApp }` (sin ROLES); `const { inputStyle, roles } = useApp()`; chips:
```tsx
const chips = [{ key: 'todos', label: 'Todos' }, ...roles.map(r => ({ key: r.key, label: r.label }))]
// ...
{chips.map(c => <RoleChip key={c.key} role={c.key} label={c.label} active={filtroRol === c.key} onClick={() => setFiltroRol(c.key)} />)}
```

- [ ] **Step 5: `UserRow.tsx`** — `import { useApp }`; `import { normalizeRole, ADMIN_ROLE } from '@/shared/auth/permissions'`. `const { ..., roles } = useApp()`. Agregar:
```tsx
const isProtected = normalizeRole(u.rol) === ADMIN_ROLE
const roleLabel = roles.find(r => r.key === u.rol)?.label || u.rol
```
Celda de rol: si `isProtected` → badge con `roleLabel`; si no → `<select>` con `roles.map(r => <option value={r.key}>{r.label}</option>)`. Botones desactivar/eliminar: condicionar a `!isProtected`.

- [ ] **Step 6: `CreateUserModal.tsx`** — `import { useApp, COLORES_AVATAR, CARGOS_DIR }` (sin ROLES); `import { DEFAULT_ROLE } from '@/shared/auth/permissions'`. `DEFAULT_NEW.rol = DEFAULT_ROLE`. `const { ..., roles } = useApp()`. Dropdown: `roles.map(r => <option value={r.key}>{r.label}</option>)`.

- [ ] **Step 7: `EditUserModal.tsx`** — `import { useApp, COLORES_AVATAR }` (sin ROLES). `const { ..., roles } = useApp()`. Dropdown: `roles.map(r => <option value={r.key}>{r.label}</option>)`.

- [ ] **Step 8: `AdminModule.tsx`** — el gate `if (!esSuperAdmin)` pasa a `if (!esAdmin)`. El fallback `rol: u.rol || 'stratix360'` → `DEFAULT_ROLE` (importar de permissions).

- [ ] **Step 9: `create-user/route.ts`** — borrar `import { normalizeRole, ROLE_LABELS }`; `import { DEFAULT_ROLE } from '@/shared/auth/permissions'`. `buildWelcomeEmail` recibe `areaLabel: string` (en vez de derivar de ROLE_LABELS). En `POST`, antes de mandar el mail:
```ts
const { data: roleRow } = await supabaseAdmin.from('roles').select('label').eq('key', rol || DEFAULT_ROLE).maybeSingle()
const areaLabel = roleRow?.label || (rol || DEFAULT_ROLE)
```
Pasar `areaLabel` a `sendWelcomeEmail`/`buildWelcomeEmail`. Reemplazar los `rol || 'stratix360'` por `rol || DEFAULT_ROLE`.

- [ ] **Step 9b: Auto-gate de los módulos** (reemplaza `canCobranzas/canResearch/canMedical`). En cada uno, usar `modules` del contexto:
  - `features/cobranzas/components/CobranzasModule.tsx`: `const { modules } = useApp()` → `if (!modules.includes('cobranzas')) return <AccessDenied ... />`.
  - `features/cobranzas/hooks/useCobranzasData.ts`: `const { modules } = useApp()`; reemplazar `canCobranzas` por `const canCobranzas = modules.includes('cobranzas')` (mantener el nombre local y lo que retorna para no romper consumidores del hook).
  - `features/research/components/ResearchModule.tsx`: `const { modules } = useApp()` → `if (!modules.includes('research')) return <AccessDenied ... />`.
  - `features/medical/components/MedicalModule.tsx`: `const { modules, border } = useApp()` → `if (!modules.includes('medical')) return <AccessDenied ... />`.

- [ ] **Step 10: Typecheck + tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: sin errores; `features/admin/index.test.ts` y los demás verdes.

- [ ] **Step 11: Commit**
```bash
git add shared/components/AppShell.tsx middleware.ts features/ app/api/admin/create-user/route.ts
git commit -m "feat(roles): consumidores DB-driven (sidebar data-driven, dropdowns, middleware, auto-gate por módulo)"
```

---

## Task 7: Authz server-side + ruteo de cambios de rol + guard último admin

**Files:**
- Create: `shared/db/supabaseAdmin.ts`, `shared/db/requireAdmin.ts`
- Modify: `features/admin/hooks/useUserActions.ts`, `app/api/admin/update-user/route.ts`, `app/api/admin/delete-user/route.ts`, `app/api/admin/reassign-and-delete/route.ts`
- Test: `shared/auth/roleValidation.test.ts` (ya cubre `isLastAdmin`)

**Interfaces:**
- Consumes: `isLastAdmin` (Task 3), `ADMIN_ROLE` (Task 2).
- Produces: `supabaseAdmin(): SupabaseClient` (factory service_role, reusable); `requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }>`.

- [ ] **Step 0: Crear el factory `shared/db/supabaseAdmin.ts`** (elimina el `createClient(...service_role...)` repetido en cada ruta admin):
```ts
import { createClient } from '@supabase/supabase-js'
import { clientEnv } from './env.client'
import { serverEnv } from './env.server'

// Cliente service_role para rutas admin (bypassa RLS). NUNCA en el cliente browser.
export function supabaseAdmin() {
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
```

- [ ] **Step 0b: Promover el helper HTTP a `shared/` (lo necesita la API de roles)**

`features/admin/api.ts` exporta `apiPost`, que es **genérico** (no admin) y ya está duplicado a mano en
`features/research/.../MailCampaignModal.tsx`. Moverlo a `shared/api.ts` y agregar `apiSend` para PATCH/DELETE:
```ts
// shared/api.ts — helper HTTP genérico (JSON in/out). Caller decide según res.ok.
export async function apiSend(method: string, url: string, body?: unknown): Promise<{ res: Response; result: any }> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await res.json().catch(() => ({}))   // DELETE puede no traer body
  return { res, result }
}
export const apiPost = (url: string, body: unknown) => apiSend('POST', url, body)
```
Borrar `features/admin/api.ts`; actualizar los 7 imports de admin (`'../api'` → `'@/shared/api'`).
(Research dedupea su fetch a mano en otro ticket — ver `.todo`.)

- [ ] **Step 1: Crear `shared/db/requireAdmin.ts`**

Lee la sesión del que llama (cookies, cliente SSR) y verifica su rol en DB con el factory:
```ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { clientEnv } from '@/shared/db/env.client'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { ADMIN_ROLE, normalizeRole } from '@/shared/auth/permissions'

export async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const cookieStore = cookies()
  const ssr = createServerClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { get: (n) => cookieStore.get(n)?.value },
  })
  const { data: { user } } = await ssr.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'No autenticado.' }
  const { data: row } = await supabaseAdmin().from('usuarios').select('id,rol').eq('auth_id', user.id).maybeSingle()
  if (!row || normalizeRole(row.rol) !== ADMIN_ROLE) return { ok: false, status: 403, error: 'Requiere rol admin.' }
  return { ok: true, userId: row.id }
}
```
> Verificar el nombre exacto del anon key en `clientEnv` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
> Las rutas admin **tocadas** (update/delete/reassign/create-user) pueden migrar su
> `createClient(...)` inline a `supabaseAdmin()` de paso (opcional; el ticket de helpers comunes
> hace el resto). Las **rutas nuevas** (`roles/*`) lo usan sí o sí.

- [ ] **Step 2: Aplicar `requireAdmin` en las 3 rutas de mutación**

Al inicio de cada `POST` de `update-user`, `delete-user`, `reassign-and-delete`:
```ts
const authz = await requireAdmin()
if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
```

- [ ] **Step 3: Guard del último admin en `update-user` y `delete-user`**

En `update-user` cuando `rol` cambia a algo != admin sobre un usuario que ES admin, y en `delete-user`/`reassign-and-delete`: cargar todos los `usuarios(id,rol)` con el admin client y rechazar si `isLastAdmin(users, targetId)`:
```ts
import { isLastAdmin } from '@/shared/auth/roleValidation'
// ...
const { data: all } = await supabaseAdmin.from('usuarios').select('id,rol')
if (isLastAdmin(all || [], targetId) && /* se va a degradar o borrar */) {
  return NextResponse.json({ error: 'No se puede degradar/borrar al último admin.' }, { status: 400 })
}
```
(En `update-user`, "se va a degradar" = el body trae `rol` y `rol !== 'admin'` y el target actual es admin.)

> **TOCTOU (nota):** este chequeo es read-then-write a nivel app, no transaccional — dos
> degradaciones simultáneas de dos admins distintos podrían pasar ambas. El riesgo es
> despreciable en una org chica (un solo admin operando). Si se quiere blindaje fuerte, el
> follow-up es moverlo a un RPC Postgres con `SELECT ... FOR UPDATE`. No se implementa acá.

- [ ] **Step 4: Rutear `cambiarRol` por la API** — en `useUserActions.ts`, cambiar `cambiarRol` para que use `apiPost('/api/admin/update-user', { id, rol })` (como `toggleActivo`), en vez de `usuariosRepo.updateRol`:
```ts
async function cambiarRol(id: string, rol: string) {
  const { res, result } = await apiPost('/api/admin/update-user', { id, rol })
  if (!res.ok) { mostrarMensaje('error', result.error || 'No se pudo cambiar el rol.'); return }
  setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol } : u))
  mostrarMensaje('ok', 'Rol actualizado')
}
```
(Quitar el import de `usuariosRepo` si queda sin uso.) Borrar también `updateRol` de
`shared/data/usuarios.ts` (escribía `rol` por el browser client → el trigger lo bloquearía; queda muerto y es un footgun).

- [ ] **Step 5: Typecheck + tests** — Run: `pnpm exec tsc --noEmit && pnpm test` → todo verde.

- [ ] **Step 6: Verificación manual (dev)** — como usuario no-admin, pegarle a `/api/admin/update-user` → 403. Degradar al único admin → 400.

- [ ] **Step 7: Commit**
```bash
git add shared/db/supabaseAdmin.ts shared/db/requireAdmin.ts features/admin/hooks/useUserActions.ts app/api/admin/
git commit -m "feat(roles): supabaseAdmin factory + requireAdmin en rutas admin + cambiarRol por API + guard último admin"
```

---

## Task 8: API de gestión de roles

**Files:**
- Create: `app/api/admin/roles/route.ts` (GET, POST), `app/api/admin/roles/[key]/route.ts` (PATCH, DELETE)

**Interfaces:**
- Consumes: `requireAdmin` (Task 7), `validateNewRole`/`validateModuleSlugs` (Task 3).
- Produces (HTTP): `GET /api/admin/roles` → `{ roles: RoleRow[], roleModules: {role_key,module_slug}[] }`; `POST` body `{ label, modules: string[] }` → crea rol; `PATCH /api/admin/roles/[key]` body `{ label?, modules? }`; `DELETE /api/admin/roles/[key]`.

- [ ] **Step 1: `app/api/admin/roles/route.ts`**
```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { requireAdmin } from '@/shared/db/requireAdmin'
import { validateNewRole, validateModuleSlugs } from '@/shared/auth/roleValidation'
import type { RoleRow } from '@/shared/auth/permissions'

export async function GET() {
  const authz = await requireAdmin(); if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  const db = supabaseAdmin()
  const [{ data: roles }, { data: roleModules }] = await Promise.all([
    db.from('roles').select('*').order('label'), db.from('role_modules').select('*'),
  ])
  return NextResponse.json({ roles: roles || [], roleModules: roleModules || [] })
}

export async function POST(req: NextRequest) {
  const authz = await requireAdmin(); if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  const { label, modules = [] } = await req.json()
  const mods = validateModuleSlugs(modules); if (!mods.ok) return NextResponse.json({ error: mods.error }, { status: 400 })
  const db = supabaseAdmin()
  const { data: existing } = await db.from('roles').select('key,label,is_system')
  const v = validateNewRole(label, (existing as RoleRow[]) || []); if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  const { error: e1 } = await db.from('roles').insert({ key: v.key, label: label.trim(), is_system: false })
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 })
  if (modules.length) {
    const { error: e2 } = await db.from('role_modules').insert(modules.map((m: string) => ({ role_key: v.key, module_slug: m })))
    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 })
  }
  return NextResponse.json({ key: v.key }, { status: 201 })
}
```

- [ ] **Step 2: `app/api/admin/roles/[key]/route.ts`**
```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { requireAdmin } from '@/shared/db/requireAdmin'
import { validateModuleSlugs } from '@/shared/auth/roleValidation'

export async function PATCH(req: NextRequest, { params }: { params: { key: string } }) {
  const authz = await requireAdmin(); if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  const { label, modules } = await req.json()
  const db = supabaseAdmin()
  // Roles is_system (admin/sin_asignar): se puede renombrar el label, NO editar módulos
  // (admin = short-circuit sin filas; sin_asignar = baseline sin módulos). Evita data rot.
  const { data: roleRow } = await db.from('roles').select('is_system').eq('key', params.key).maybeSingle()
  if (label !== undefined) {
    const { error } = await db.from('roles').update({ label: String(label).trim() }).eq('key', params.key)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (Array.isArray(modules)) {
    if (roleRow?.is_system) return NextResponse.json({ error: 'No se pueden editar los módulos de un rol del sistema.' }, { status: 400 })
    const v = validateModuleSlugs(modules); if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
    await db.from('role_modules').delete().eq('role_key', params.key)
    if (modules.length) await db.from('role_modules').insert(modules.map((m: string) => ({ role_key: params.key, module_slug: m })))
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { key: string } }) {
  const authz = await requireAdmin(); if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  const db = supabaseAdmin()
  const { data: role } = await db.from('roles').select('is_system').eq('key', params.key).maybeSingle()
  if (role?.is_system) return NextResponse.json({ error: 'No se puede borrar un rol del sistema.' }, { status: 400 })
  const { count } = await db.from('usuarios').select('id', { count: 'exact', head: true }).eq('rol', params.key)
  if (count && count > 0) return NextResponse.json({ error: `El rol tiene ${count} usuario(s). Reasignalos antes de borrar.` }, { status: 400 })
  const { error } = await db.from('roles').delete().eq('key', params.key)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Typecheck** — Run: `pnpm exec tsc --noEmit` → sin errores.

- [ ] **Step 4: Verificación manual (dev)** — como admin: POST crea "Soporte"; el `is_system` admin no se puede borrar (DELETE → 400); borrar un rol con usuarios → 400.

- [ ] **Step 5: Commit**
```bash
git add app/api/admin/roles/
git commit -m "feat(roles): API de gestión de roles (GET/POST/PATCH/DELETE) con authz + validación"
```

---

## Task 9: UI de gestión de roles

**Files:**
- Create: `features/admin/components/RolesManager.tsx`, `features/admin/components/CreateRoleModal.tsx`
- Modify: `features/admin/components/AdminModule.tsx`

**Interfaces:**
- Consumes: `useApp().{roles, ...theme}`, `apiPost`/`apiSend` de `@/shared/api` (POST/PATCH/DELETE a `/api/admin/roles`), `ALL_MODULES`+`MODULE_META` (labels), `ADMIN_ROLE`.

- [ ] **Step 1: `CreateRoleModal.tsx`** — modal con input `label` + grid de checkboxes de módulos **asignables**; al guardar `POST /api/admin/roles { label, modules }`; on success refresca y cierra. (Estilos: copiar el patrón de `CreateUserModal`/`EditUserModal` — `s1/border/t1/inputStyle` de `useApp`.)
```ts
// 'admin' NO se reparte: el acceso total es el ROL admin (short-circuit), no un módulo asignable.
// Tildarlo daría un grant fantasma (ícono en sidebar → AccessDenied por el gate esAdmin). Se excluye.
const ASIGNABLES = ALL_MODULES.filter(s => s !== ADMIN_ROLE)  // ADMIN_ROLE === 'admin' === slug del módulo admin
// grid: ASIGNABLES.map(s => ({ slug: s, name: MODULE_META[s].name }))
```
(Mismo `ASIGNABLES` en el editor de módulos de `RolesManager` — Step 2.)

- [ ] **Step 2: `RolesManager.tsx`** — carga `GET /api/admin/roles`, lista roles con su label + chips de módulos + **conteo de usuarios** (de `adminUsuarios` del contexto: `adminUsuarios.filter(u => u.rol === r.key).length`); por rol: botón editar (PATCH label/módulos), botón borrar **deshabilitado si conteo>0 o is_system**; botón "+ Nuevo rol" abre `CreateRoleModal`. El rol `ADMIN_ROLE`: checkboxes **todos tildados desde `ALL_MODULES`** (no de `role_modules`, que no tiene filas para admin) y **deshabilitados/read-only**, sin borrar.

- [ ] **Step 3: `AdminModule.tsx`** — agregar un toggle `vista: 'usuarios' | 'roles'` (dos botones tab); render condicional: `usuarios` (lo actual: StatsBar/RoleFilterBar/UserTable) o `roles` (`<RolesManager />`). Ambos bajo el gate `esAdmin`.

- [ ] **Step 4: Typecheck + tests** — Run: `pnpm exec tsc --noEmit && pnpm test` → verde.

- [ ] **Step 5: Verificación manual (dev)** — entrar a /admin como admin → tab Roles; crear "Soporte" con solo `directorio`; aparece en el dropdown de rol de usuarios; asignarlo a un test user → ve solo Directorio.

- [ ] **Step 6: Commit**
```bash
git add features/admin/components/RolesManager.tsx features/admin/components/CreateRoleModal.tsx features/admin/components/AdminModule.tsx
git commit -m "feat(roles): UI de gestión de roles en /admin (lista, crear, editar, borrar)"
```

---

## Task 10: Docs + verificación E2E + propagación a prod

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Actualizar `CLAUDE.md`** — reescribir la sección "## Roles de usuario": los roles son **dinámicos** (tabla `roles`, gestionados por el admin desde /admin); `admin` = acceso total (único tier); `sin_asignar` = rol por defecto sin módulos. Actualizar la referencia a `lib/permissions.ts` → `shared/auth/permissions.ts` (helpers map-driven, ya no matriz hardcodeada). Actualizar la línea de Convenciones de permisos: verificar acceso con `getModulesForRole(map, role).includes(module)` (o `useApp().modules.includes(module)` en componentes); ya no hay `canAccess`.

- [ ] **Step 2: Verificación E2E completa en dev** (checklist del spec):
  - admin ve todos los módulos.
  - crear rol "soporte" solo con `directorio` → asignar a user test → ve solo Directorio; agregar módulo → acceso al refrescar.
  - alta nueva sin rol → `sin_asignar` → solo Home (launchpad vacío).
  - **RLS↔módulos:** dar `cobranzas` a un rol no-admin → ve filas de `cobranzas_*`; quitarlo → no ve.
  - `admin` no borrable; rol con usuarios no borrable.
  - como no-admin, request directo a `/api/admin/roles` → 403; intento de auto-cambiar `rol` por el cliente → bloqueado por el trigger.
  - `SELECT DISTINCT rol FROM usuarios` → solo keys nuevas.

- [ ] **Step 3: Commit docs**
```bash
git add CLAUDE.md
git commit -m "docs(roles): actualizar CLAUDE.md al modelo de roles dinámicos"
```

- [ ] **Step 4: Merge a development + push**
```bash
git push -u origin feature/dynamic-roles
# abrir PR feature/dynamic-roles → development, mergear tras review
```

- [ ] **Step 5: Propagar a prod (tras soak en development)**
```bash
# en main, tras mergear development→main:
pnpm supabase link --project-ref ruedelunbtaomhrzgelc
pnpm supabase db push
```
Verificar en prod el mismo checklist mínimo (roles sembrados, FK, RLS, un usuario no-admin ve lo que su rol da).

---

## Notas de ejecución

- **Orden:** Task 1 (migración en dev) debe correr antes de probar Tasks 5-9 contra dev (la app lee `roles`).
- **Tasks 2 y 3** son lógica pura con tests — se pueden hacer en paralelo a la migración.
- **`normalizeRole` shim:** se mantiene toda la feature; quitarlo es un PR follow-up (anotado en `.todo`).
- **Fuera de alcance** (no tocar acá): auth hook Edge, auditoría/historial, CSV, directorio/departamentos, gen types. Ver `.todo`.

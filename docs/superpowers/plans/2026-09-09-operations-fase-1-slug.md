# `operations` — Fase 1: el slug, con convivencia

> **Para quien ejecute esto:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan
> checkbox (`- [ ]`).

**Objetivo:** renombrar el slug del módulo de tareas de `tasks` a `operations` **sin que la app se
caiga en ningún momento**, dejando el terreno listo para las fases 2 a 6.

**Arquitectura:** el slug vive a la vez en la base (`role_modules`, las policies de RLS) y en el
bundle de Next (el catálogo de permisos, la ruta, el ámbito de los filtros). Migración y deploy son
pasos separados en este proyecto, así que **cambiar los dos a la vez es imposible** y cualquiera de
los dos órdenes apaga el módulo. La fase se resuelve con un **período de convivencia**: primero la
base acepta los dos slugs, después el bundle cambia, y sólo entonces se retira el viejo.

**Stack:** Next.js 14 (App Router) + Supabase (Postgres 17) + TypeScript + Vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-09-09-operations-unificacion-design.md`, §8 y §8.1.

## Restricciones globales

- **`main` no acepta push directo:** hay un ruleset, todo va por PR.
- **`pnpm supabase db reset` está PROHIBIDO en este repo:** `config.toml` apunta `sql_paths` a un
  `seed.sql` inexistente y un reset borra las actividades sin que ningún seed las restaure. Para
  aplicar migraciones en local: `pnpm supabase migration up`.
- **`db push` aplica TODAS las migraciones pendientes**, no sólo la última. `pnpm supabase
  migration list --linked` antes de cada push a prod.
- **`db push` aplica cada archivo en su propia transacción**, así que cada migración de este plan
  va envuelta en su propio `BEGIN; … COMMIT;`.
- **Probar permisos con una cuenta de admin no prueba nada:** `has_module()` abre con
  `is_admin() OR …`, así que le devuelve `true` a cualquier slug, incluso a uno mal escrito.
- **La RLS se verifica consultando como `anon` y con un rol sin privilegios**, no leyendo el
  esquema. Ver una policy no es ver control de acceso (incidente del 29/08).
- **No commitear sin que Wagner apruebe:** dejar el árbol listo, correr el gate, mostrar qué entra.
- **`prod` es la única fuente autoritativa de `role_modules`.** Ni las migraciones ni la base local
  lo son: local está drifteado (§8.1 del spec).

## Lo que esta fase NO hace

- **No toca el módulo `reuniones`.** Su slug sobrevive intacto. Absorberlo exige que su UI ya sea
  una pestaña y que `src/app/(app)/reuniones/` desaparezca — si se borra el slug con la ruta viva,
  `moduleForPath` devuelve `null` y **`ModuleGate` deja pasar a cualquiera con sesión**
  (`ModuleGate/index.tsx:26`, la rama `slug && …`). Eso es la fase 3.
- **No agrega ningún rol.** `operations` va exactamente a quien tiene `tasks` hoy. La consecuencia
  de nómina de §2.5 del spec llega con la fase 3, no acá.
- **No renombra `src/features/tasks/`** ni las claves internas de UI (`PanelKey`, `NAV[].key`,
  `SUB_ITEMS.tasks`): ésas **no son el slug** — el slug entra por `slug: MODULE.TASKS`. Renombrarlas
  es diff sin beneficio, y la mudanza de carpetas es la fase 6.

## Orden de despliegue, y por qué

| Paso | Qué | Dónde |
|---|---|---|
| **PR 1** | La tolerancia a los dos slugs (Tarea 1) | deploy |
| **1A** | Migración: abre — `INSERT` de `operations`, policies `operations OR tasks` (Tarea 2) | `db push` |
| **PR 2** | El catálogo cambia de valor (Tareas 3-4) | deploy |
| **1C** | Migración: cierra — `DELETE` por slug, policies sólo `operations`, `vistas_filtro` (Tarea 5) | `db push` |

**La tolerancia va primero y sola.** Entre 1A y el deploy del PR 2 la base tiene filas `operations`
que el bundle viejo no conoce: `validateModuleSlugs` las rechazaría y
`api/admin/roles/[key]/route.ts` **borra todas las filas del rol antes de insertar**, así que editar
un rol en `/admin` en esa ventana le arrancaría el módulo. Con la tolerancia deployada antes, la
ventana es segura.

---

## Estructura de archivos

**Se crean:**
- `supabase/migrations/<ts>_operations_slug_abre.sql` — 1A
- `supabase/migrations/<ts>_operations_slug_cierra.sql` — 1C
- `supabase/rollback/operations-slug-rollback.sql` — el rollback de las dos
- `src/shared/auth/permissions/modulos/legacy.ts` — la lista de slugs retirados que `/admin` sigue
  tolerando. Archivo propio porque es **transitorio** y se borra entero cuando se retire.
- `src/app/(app)/operations/page.tsx` — la thin route nueva
- `e2e/operations-slug.spec.ts` — la verificación por rol real

**Se modifican:**
- `src/shared/auth/permissions/modulos/slugs.ts:9` — el valor del slug
- `src/shared/auth/permissions/modulos/index.ts:12-17` — la entrada de `MODULE_META`
- `src/shared/auth/roleValidation.ts:26-29` — `validateModuleSlugs` acepta los retirados
- `src/shared/components/shell/appShellConfig/nav.ts:6,20` y `paneles.ts:6` — la referencia al slug
- `src/shared/auth/permissions/rutas/index.test.ts:30` y `modulos/index.test.ts:15` — los dos tests
  que afirman el slug viejo
- `src/shared/auth/roleValidation.test.ts` — el test de la tolerancia

**Se borra:**
- `src/app/(app)/tasks/page.tsx` (y su carpeta)

---

## Tarea 1: La tolerancia a los slugs retirados

Un slug que se retira sigue existiendo en las filas de `role_modules` hasta que una migración las
borre. Durante esa ventana, `/admin` tiene que poder guardar un rol sin arrancarle el módulo.

**Files:**
- Create: `src/shared/auth/permissions/modulos/legacy.ts`
- Modify: `src/shared/auth/roleValidation.ts:26-29`
- Test: `src/shared/auth/roleValidation.test.ts`

**Interfaces:**
- Consume: `isModuleSlug` de `@/shared/auth/permissions`
- Produce: `SLUGS_RETIRADOS: readonly string[]` y `esSlugConocido(s: string): boolean`

- [ ] **Paso 1: Escribir el test que falla**

En `src/shared/auth/roleValidation.test.ts`, agregar al final:

⚠️ **La prueba portante es la de `esSlugConocido`, no la de `validateModuleSlugs`.** En este momento
`MODULE.TASKS` todavía vale `'tasks'`, así que `isModuleSlug('tasks')` devuelve `true` y
`validateModuleSlugs(['tasks'])` **ya pasa sin la implementación**: ese test no puede fallar por el
motivo correcto hasta la Tarea 3. Se conserva igual, como guarda de regresión, pero el ciclo TDD lo
cierra el primero.

```ts
import { validateModuleSlugs } from './roleValidation'
import { esSlugConocido } from '@/shared/auth/permissions/modulos/legacy'

describe('esSlugConocido', () => {
  it('reconoce un slug retirado', () => {
    expect(esSlugConocido('tasks')).toBe(true)
  })
  it('no reconoce uno que nunca existió', () => {
    expect(esSlugConocido('medial')).toBe(false)
  })
  // Un slug vigente NO es asunto de esta lista: lo resuelve `isModuleSlug`. Si algún día devuelve
  // true acá, es que alguien puso un slug vivo entre los retirados.
  it('no reconoce un slug vigente', () => {
    expect(esSlugConocido('medical')).toBe(false)
  })
})

describe('validateModuleSlugs con slugs retirados', () => {
  it('acepta un slug vigente', () => {
    expect(validateModuleSlugs(['medical'])).toEqual({ ok: true })
  })

  // Durante la convivencia, `role_modules` tiene filas del slug viejo Y del nuevo. Guardar un rol
  // en /admin manda las dos, y la ruta borra todas las filas antes de insertar: si el validador
  // rechaza una, el rol pierde el módulo.
  //
  // OJO: hoy este test pasa por `isModuleSlug`, no por la lista de retirados — `MODULE.TASKS`
  // todavía vale 'tasks'. Recién es portante después de la Tarea 3, que lo re-corre.
  it('acepta un slug retirado que todavía tiene filas en la base', () => {
    expect(validateModuleSlugs(['tasks'])).toEqual({ ok: true })
  })

  it('sigue rechazando un slug que no existe ni existió', () => {
    expect(validateModuleSlugs(['medial'])).toEqual({
      ok: false, error: 'Módulos inválidos: medial',
    })
  })
})
```

- [ ] **Paso 2: Correrlo y ver que falla**

Run: `pnpm test src/shared/auth/roleValidation.test.ts`
Expected: FAIL en los tres de `esSlugConocido` — el módulo `.../modulos/legacy` no existe todavía,
así que el archivo ni siquiera resuelve el import. Los de `validateModuleSlugs` pasan ya: es lo
esperado y está explicado arriba.

- [ ] **Paso 3: Escribir el mínimo que lo hace pasar**

Crear `src/shared/auth/permissions/modulos/legacy.ts`:

```ts
// Slugs que ya no están en MODULE pero todavía tienen filas en `role_modules`, porque la
// migración que las borra corre DESPUÉS del deploy que cambia el catálogo.
//
// Vive en su propio archivo porque es transitorio: cuando la migración de cierre borre las filas,
// este archivo se borra entero. Adentro de `slugs.ts` habría que ir a buscarlo entre lo vigente.
//
// Se retira `'tasks'` cuando `20260909_operations_slug_cierra.sql` esté aplicada en producción
// Y verificada con `select count(*) from role_modules where module_slug = 'tasks'` = 0.
export const SLUGS_RETIRADOS = ['tasks'] as const

/** ¿Es un slug que la app conoce, vigente o recién retirado? */
export function esSlugConocido(s: string): boolean {
  return (SLUGS_RETIRADOS as readonly string[]).includes(s)
}
```

En `src/shared/auth/roleValidation.ts`, cambiar `validateModuleSlugs`:

```ts
import { esSlugConocido } from '@/shared/auth/permissions/modulos/legacy'

export function validateModuleSlugs(slugs: string[]): { ok: true } | { ok: false; error: string } {
  const bad = slugs.filter((s) => !isModuleSlug(s) && !esSlugConocido(s))
  return bad.length ? { ok: false, error: `Módulos inválidos: ${bad.join(', ')}` } : { ok: true }
}
```

- [ ] **Paso 4: Correr los tests y ver que pasan**

Run: `pnpm test src/shared/auth/roleValidation.test.ts`
Expected: PASS, los tres.

- [ ] **Paso 5: El gate completo**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: verde. Si el barrido del centinela reporta hallazgos nuevos en `legacy.ts`, corregirlos —
no firmarlos.

- [ ] **Paso 6: Mostrar el diff a Wagner y, con su OK, commitear**

```bash
git add src/shared/auth/permissions/modulos/legacy.ts src/shared/auth/roleValidation.ts \
        src/shared/auth/roleValidation.test.ts
git commit -m "feat(permisos): /admin tolera un slug retirado que aún tiene filas"
```

**Este commit sale en su propio PR y se deployea ANTES de la migración 1A.** No sigas a la Tarea 2
hasta que esté en producción.

---

## Tarea 1b: el bundle ignora un slug que no conoce

⚠️ **Esta tarea no estaba en el plan original. La encontró el ensayo del apagón** (paso 5 de la
Tarea 2), corriendo la app contra la base ya migrada: la home no perdía una tarjeta, **se caía
entera** con `TypeError: Cannot read properties of undefined (reading 'name')`.

`getModulesForRole` devolvía `map[role] ?? []` — los slugs crudos de `role_modules`, tipados
`ModuleSlug[]` pero nunca validados. Esa columna es `text` **sin FK**, así que el tipo miente: con un
slug que el catálogo no conoce, `MODULE_META[slug]` da `undefined` y `page.tsx:393` revienta.

Va en la **misma PR que la Tarea 1** — es la misma ventana y el mismo problema — y **sin esto la
migración 1A no se puede pushear**.

**Files:**
- Modify: `src/shared/auth/permissions/roles/index.ts` (la línea de retorno de `getModulesForRole`)
- Test: `src/shared/auth/permissions/roles/index.test.ts`

**Interfaces:**
- Produce: `getModulesForRole` devuelve **sólo** slugs del catálogo. El tipo de retorno pasa a ser
  cierto, y todos sus consumidores —Launchpad, rail, `ModuleGate`, el atajo del último módulo—
  quedan protegidos de una sola vez.

- [ ] **Paso 1: Escribir el test que falla**

```ts
  it('ignora un slug desconocido de `role_modules` y conserva los conocidos', () => {
    // La columna es `text` sin FK: la base puede tener un slug que el catálogo no conoce
    // (ej. 'operations') y eso no puede tirar abajo el Launchpad.
    const mapConSlugInvalido = {
      stratix360: ['stratix-mkt', 'operations', 'directorio'],
    } as RoleModuleMap
    expect(getModulesForRole(mapConSlugInvalido, 'stratix360')).toEqual(['stratix-mkt', 'directorio'])
  })
```

- [ ] **Paso 2: Correrlo y ver que falla**

Run: `pnpm test src/shared/auth/permissions/roles`
Expected: FAIL — devuelve los tres, con `'operations'` adentro.

- [ ] **Paso 3: El filtro**

```ts
  // `role_modules.slug` es `text` sin FK: filtrar por `isModuleSlug` evita que un slug que la
  // base tiene y el catálogo no (ej. 'operations') tire abajo el Launchpad.
  return (map[role] ?? []).filter(isModuleSlug)
```

`isModuleSlug` sale de `../modulos`, de donde ese archivo ya importa `ALL_MODULES`.

- [ ] **Paso 4: El gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`

- [ ] **Paso 5: La comprobación que vale — recargar la app**

Con la base local ya en 1A, la home tiene que cargar. Es el mismo escenario que la tiró abajo.

---

## Tarea 2: Migración 1A — abrir el slug nuevo

**Files:**
- Create: `supabase/migrations/<ts>_operations_slug_abre.sql`
- Create: `supabase/rollback/operations-slug-rollback.sql`

**Interfaces:**
- Consume: la tabla `role_modules (role_key, module_slug)`, PK compuesta
- Produce: filas `operations` en `role_modules`; las policies de `actividades` aceptando los dos
  slugs

- [ ] **Paso 1: Re-resolver el reparto contra PRODUCCIÓN, no contra local ni contra el spec**

```bash
pnpm supabase db query --linked \
  "select role_key from role_modules where module_slug = 'tasks' order by 1;"
```

Anotar el resultado literal en el PR. Al 09/09 daba `admin` y `stratix360`, pero **es una foto**: si
alguien creó un rol nuevo con el módulo desde `/admin`, aparece acá y no en ninguna migración. La
lista del `INSERT` del paso 3 se escribe con lo que devuelva este comando, **menos `admin`**.

- [ ] **Paso 2: Escribir el rollback ANTES que la migración**

Crear `supabase/rollback/operations-slug-rollback.sql`:

```sql
-- Rollback de la fase 1 de `operations` (las migraciones _abre y _cierra).
-- Devuelve el slug `tasks` y deja las policies como estaban. NO borra datos.
BEGIN;

-- 1. Las filas. `admin` recupera la suya porque en prod la tenía (repuesta desde /admin), aunque
--    la convención diga que no debería.
INSERT INTO public.role_modules (role_key, module_slug) VALUES
  ('admin', 'tasks'),
  ('stratix360', 'tasks')
ON CONFLICT DO NOTHING;

DELETE FROM public.role_modules WHERE module_slug = 'operations';

-- 2. Las policies de `actividades`, exactamente como las dejó 20260903235201.
DO $do$
DECLARE
  slug_tasks   text := 'tasks';
  slug_stratix text := 'stratix-mkt';
  cond         text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_tasks) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_tasks;
  END IF;
  cond := format('(public.has_module(%L) OR public.has_module(%L))', slug_tasks, slug_stratix);

  EXECUTE 'DROP POLICY IF EXISTS "colaborador_read" ON public.actividades';
  EXECUTE format('CREATE POLICY "colaborador_read" ON public.actividades FOR SELECT USING %s', cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_insert_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_insert_modulo" ON public.actividades
                    FOR INSERT WITH CHECK %s', cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_update_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_update_modulo" ON public.actividades
                    FOR UPDATE USING %s WITH CHECK %s', cond, cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_delete_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_delete_modulo" ON public.actividades
                    FOR DELETE USING %s', cond);
END $do$;

-- 3. El ámbito de los filtros.
UPDATE public.vistas_filtro SET ambito = 'tasks' WHERE ambito = 'operations';

COMMIT;
```

- [ ] **Paso 3: Crear y escribir la migración de apertura**

```bash
pnpm supabase migration new operations_slug_abre
```

Contenido (reemplazar la lista del `INSERT` por lo que devolvió el paso 1, sin `admin`):

```sql
-- FASE 1, PASO 1A: abre `operations` SIN cerrar `tasks`.
--
-- Migración y deploy son pasos separados en este proyecto, así que el slug no puede cambiar en la
-- base y en el bundle a la vez. Y los dos órdenes rompen: si la base cambia primero, el bundle
-- viejo pide `tasks`, `getModulesForRole` devuelve `operations` y su `isModuleSlug` lo rechaza —
-- el módulo desaparece del Launchpad y /tasks cae en AccessDenied, sin un solo error. Si el bundle
-- cambia primero, `has_module('operations')` da false porque no hay filas.
--
-- Por eso esta migración sólo AGREGA. La app vieja sigue funcionando igual: sus filas `tasks`
-- están intactas y las policies aceptan los dos slugs.
--
-- `admin` NO recibe fila: `getModulesForRole` corta por short-circuit y le da todos los módulos
-- tenga filas o no. Sembrarla sería data muerta — la convención está escrita en
-- 20260624210414_dynamic_roles.sql.
BEGIN;

INSERT INTO public.role_modules (role_key, module_slug) VALUES
  ('stratix360', 'operations')
ON CONFLICT DO NOTHING;

DO $do$
DECLARE
  slug_nuevo   text := 'operations';
  slug_viejo   text := 'tasks';
  slug_stratix text := 'stratix-mkt';
  cond         text;
BEGIN
  -- Los tres slugs verificados. `role_modules.module_slug` es text sin FK y `has_module()` abre
  -- con `is_admin() OR …`, así que uno mal escrito da true para el admin —que es quien prueba la
  -- migración— y false en silencio para todo el resto.
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_nuevo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_nuevo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_viejo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_viejo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_stratix) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_stratix;
  END IF;

  cond := format('(public.has_module(%L) OR public.has_module(%L) OR public.has_module(%L))',
                 slug_nuevo, slug_viejo, slug_stratix);

  -- La de lectura sigue llamándose `colaborador_read` (viene de los roles dinámicos y renombrarla
  -- no compra nada): se reemplaza en su lugar.
  EXECUTE 'DROP POLICY IF EXISTS "colaborador_read" ON public.actividades';
  EXECUTE format('CREATE POLICY "colaborador_read" ON public.actividades FOR SELECT USING %s', cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_insert_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_insert_modulo" ON public.actividades
                    FOR INSERT WITH CHECK %s', cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_update_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_update_modulo" ON public.actividades
                    FOR UPDATE USING %s WITH CHECK %s', cond, cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_delete_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_delete_modulo" ON public.actividades
                    FOR DELETE USING %s', cond);
END $do$;

COMMIT;
```

- [ ] **Paso 4: Aplicarla en local y comprobar que NO rompió nada**

```bash
pnpm supabase migration up
pnpm supabase db query --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  "select role_key, module_slug from role_modules where module_slug in ('tasks','operations') order by 2,1;"
```

Expected: las filas `tasks` **siguen todas**, y aparece `stratix360 | operations`.

- [ ] **Paso 5: El ensayo del apagón — bundle VIEJO contra base NUEVA**

Éste es el paso por el que existe toda la fase, y **es el único momento en que se puede hacer**:
la base local ya está en 1A y el árbol todavía no cambió, así que lo que corre es exactamente la
combinación que va a existir en producción entre el push y el deploy. Después de la Tarea 3 ya no
se puede reproducir sin volver atrás en git.

```bash
pnpm dev
```

Entrar con una cuenta `stratix360` —crearla con `ensureUser('ops.stratix@eminat.net','stratix360')`
de `e2e/seed.ts`, o desde `/admin`— y confirmar que **`/tasks` sigue mostrando el tablero con sus
actividades**.

**Criterio de la tarea:** si acá el tablero sale vacío, o cae en `AccessDenied`, o el ítem
desaparece del rail, la migración 1A borró algo que no debía y **no se pushea a producción**.
Anotar el resultado en el PR en una línea: *"bundle previo contra base 1A: `/tasks` funcional, N
actividades"*.

- [ ] **Paso 6: Mostrar a Wagner y commitear**

```bash
git add supabase/migrations/*_operations_slug_abre.sql supabase/rollback/operations-slug-rollback.sql
git commit -m "feat(db): abre el slug operations sin cerrar tasks"
```

---

## Tarea 3: El catálogo cambia de valor

**Files:**
- Modify: `src/shared/auth/permissions/modulos/slugs.ts:9`
- Modify: `src/shared/auth/permissions/modulos/index.ts:12-17`
- Modify: `src/shared/components/shell/appShellConfig/nav.ts:6,20`, `paneles.ts:6`
- Create: `src/app/(app)/operations/page.tsx`
- Delete: `src/app/(app)/tasks/page.tsx`
- Test: `src/shared/auth/permissions/modulos/index.test.ts:15`,
  `src/shared/auth/permissions/rutas/index.test.ts:30`

**Interfaces:**
- Consume: nada de la Tarea 1 **en código**. La tolerancia de `legacy/` sigue funcionando sola
  porque nombra el literal `'tasks'`, no la constante. (La versión anterior de esta línea decía
  "Consume `SLUGS_RETIRADOS`" y era falso: ningún paso de esta tarea la usa.)
- Produce: `MODULE.OPERATIONS === 'operations'`. Los nueve usos de `MODULE.TASKS` pasan a
  `MODULE.OPERATIONS`; **ningún consumidor usa el literal**, así que ninguno cambia de forma.

- [ ] **Paso 1: Escribir los tests que fallan**

En `src/shared/auth/permissions/modulos/index.test.ts`, cambiar la línea 15 para que espere el
slug nuevo:

```ts
      ['accounting','admin','cobranzas','directorio','medical','operations','research','reuniones','stratix-mkt','th-hr'].sort()
```

En `src/shared/auth/permissions/rutas/index.test.ts`, cambiar la línea 30 y agregar la de abajo:

```ts
    expect(moduleForPath('/operations/kanban')).toBe('operations')
    // La ruta vieja deja de pertenecer a un módulo. Importa que quede dicho: `moduleForPath`
    // devuelve null y ModuleGate DEJA PASAR con null, así que ninguna pantalla puede quedarse
    // colgando de /tasks.
    expect(moduleForPath('/tasks')).toBeNull()
```

- [ ] **Paso 2: Correrlos y ver que fallan**

Run: `pnpm test src/shared/auth/permissions`
Expected: FAIL — los dos, porque `MODULE.TASKS` todavía vale `'tasks'`.

- [ ] **Paso 3: Cambiar el slug y su metadata**

En `src/shared/auth/permissions/modulos/slugs.ts`, reemplazar la línea `TASKS: 'tasks',` por:

```ts
  OPERATIONS: 'operations',
```

En `src/shared/auth/permissions/modulos/index.ts`, la entrada de `MODULE_META`:

```ts
  [MODULE.OPERATIONS]: {
    slug: MODULE.OPERATIONS,
    name: 'Operations',
    description: 'Las tareas de toda la empresa: tablero, solicitudes y producción.',
    leader: null,
  },
```

- [ ] **Paso 4: Actualizar los nueve usos de la constante**

Son todos por la constante, así que es un reemplazo mecánico de `MODULE.TASKS` →
`MODULE.OPERATIONS` en estos archivos, **sin tocar nada más**:

- `src/features/tasks/index.ts:8`
- `src/features/tasks/hooks/useTablero/filtros.ts:32`
- `src/shared/context/team-derivations/index.ts:40`
- `src/shared/context/team-derivations/fixtures.ts:21,23`
- `src/shared/components/shell/appShellConfig/nav.ts:6,20`
- `src/shared/components/shell/appShellConfig/paneles.ts:6`

En `nav.ts:20`, además, el título:

```ts
  [MODULE.OPERATIONS]: 'Operations — Tareas del grupo',
```

**No tocar** `PanelKey`, `NAV[].key`, `SUB_ITEMS.tasks` ni `paneles.ts` clave `tasks`: son claves
internas de UI, no el slug.

- [ ] **Paso 5: Mover la ruta**

```bash
git mv "src/app/(app)/tasks" "src/app/(app)/operations"
```

El contenido de `page.tsx` no cambia: sigue montando `<TasksModule />` desde `@/features/tasks`.
La carpeta del feature se muda en la fase 6.

- [ ] **Paso 6: Correr los tests y el gate**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS. `tsc` es la red acá: si quedó un `MODULE.TASKS` sin cambiar, no compila.

- [ ] **Paso 6b: Confirmar que la tolerancia recién ahora está haciendo algo**

El test `validateModuleSlugs(['tasks'])` de la Tarea 1 pasaba por `isModuleSlug`, porque
`MODULE.TASKS` todavía valía `'tasks'`. Con el catálogo cambiado, la única forma de que siga
pasando es por la lista de retirados — o sea que recién ahora prueba lo que dice probar.

Run: `pnpm test src/shared/auth/permissions/modulos/legacy`
Expected: PASS, los cuatro. Para verlo con los ojos: comentar temporalmente
`&& !esSlugConocido(s)` en `roleValidation.ts` y confirmar que el caso
`validateModuleSlugs(['tasks'])` **ahora sí falla**; después descomentar. Sin ese paso, la única
defensa de la ventana de convivencia queda sin verificar en ningún momento.

*(La Tarea 1 movió estos tests a `legacy/index.test.ts` por la regla `familia_suelta` del
centinela, y son cuatro y no seis: los dos que faltan —un slug vigente y uno inexistente— ya están
cubiertos por `roleValidation.test.ts`.)*

- [ ] **Paso 7: Probar a mano contra la base ya migrada por 1A**

```bash
pnpm dev
```

Entrar como la cuenta `stratix360`, confirmar que `/operations` muestra el tablero y que el ítem
del rail dice "Operations". Confirmar también que **`/tasks` ya no existe** (404 de Next).

- [ ] **Paso 8: Mostrar a Wagner y commitear**

```bash
git add src/shared/auth/permissions src/shared/components/shell/appShellConfig \
        src/features/tasks/index.ts src/features/tasks/hooks/useTablero/filtros.ts \
        src/shared/context/team-derivations "src/app/(app)/operations" "src/app/(app)/tasks"
git commit -m "feat(permisos): el módulo de tareas pasa a llamarse operations"
```

---

## Tarea 4: La prueba por rol real

Probar con admin no prueba nada: `has_module()` abre con `is_admin() OR …`.

**Files:**
- Create: `e2e/operations-slug.spec.ts`

**Interfaces:**
- Consume: `ensureUser(email, rol)`, `PASSWORD` de `e2e/seed.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `e2e/operations-slug.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { PASSWORD, ensureUser } from './seed'

// Con una cuenta que NO es admin: `has_module()` abre con `is_admin() OR …`, así que probar el
// gate con un admin le da true a cualquier slug, incluso a uno mal escrito.
const CON_MODULO = 'ops.stratix@eminat.net'
const SIN_MODULO = 'ops.medico@eminat.net'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await ensureUser(CON_MODULO, 'stratix360')
  await ensureUser(SIN_MODULO, 'medico')
})

async function loginAs(page, email: string) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByPlaceholder('tu@eminat.net').fill(email)
  const pw = page.locator('input[type="password"]')
  await pw.fill(PASSWORD)
  await pw.press('Enter')
  await page.waitForURL('http://localhost:3000/', { timeout: 40000 })
  await expect(page.getByText('Home', { exact: true })).toBeVisible({ timeout: 20000 })
}

test('un rol con el módulo ve el tablero en la ruta nueva', async ({ page }) => {
  await loginAs(page, CON_MODULO)
  await page.goto('/operations')
  await expect(page.getByText('You do not have access')).toHaveCount(0)
})

test('un rol sin el módulo recibe AccessDenied, no una pantalla vacía', async ({ page }) => {
  await loginAs(page, SIN_MODULO)
  await page.goto('/operations')
  await expect(page.getByText('You do not have access')).toBeVisible({ timeout: 20000 })
})
```

- [ ] **Paso 2: Correrlo y ver el resultado**

Run: `pnpm e2e e2e/operations-slug.spec.ts`
Expected: los dos PASS con la base en 1A y el código de la Tarea 3. Si el primero falla con
`AccessDenied`, falta la fila `operations` de `stratix360`.

- [ ] **Paso 3: Verificar la RLS como `anon`, no leyendo el esquema**

```bash
pnpm db:rls
```

Expected: verde. Ver una policy no es ver control de acceso — es la lección del 29/08, y el punto
ciego de las vistas del 31/08.

- [ ] **Paso 4: Mostrar a Wagner y commitear**

```bash
git add e2e/operations-slug.spec.ts
git commit -m "test(e2e): el gate de operations, probado con roles reales"
```

**Acá termina el PR 2.** No sigas a la Tarea 5 hasta que esté mergeado y deployado en Vercel.

---

## Tarea 5: Migración 1C — cerrar el slug viejo

**Sólo después de confirmar que el deploy del PR 2 está sirviendo en `app.stratixsolutions.us`.**

**Files:**
- Create: `supabase/migrations/<ts>_operations_slug_cierra.sql`

- [ ] **Paso 1: Confirmar que el bundle nuevo está en producción**

Abrir `app.stratixsolutions.us` y confirmar que el rail dice "Operations" y que `/operations`
carga. Si todavía dice "Tasks", el deploy no terminó y esta migración **apagaría el módulo**.

- [ ] **Paso 2: Backup, en dos piezas**

```bash
pnpm supabase db dump --linked -f supabase/rollback/predump-operations-$(date +%Y%m%d)-schema.sql
pnpm supabase db dump --linked --data-only \
  -f supabase/rollback/predump-operations-$(date +%Y%m%d)-data.sql
ls -la supabase/rollback/predump-operations-*
```

Expected: los dos archivos con tamaño distinto de cero. Un backup de 0 bytes es el modo de fallo
conocido de este repo.

- [ ] **Paso 3: Escribir la migración de cierre**

```bash
pnpm supabase migration new operations_slug_cierra
```

```sql
-- FASE 1, PASO 1C: retira `tasks` ahora que el bundle nuevo está sirviendo.
--
-- El DELETE va por `module_slug` y NO enumerando roles: ahí es donde el drift muerde — una fila
-- que existe en prod y no en local se escapa de una lista escrita a mano. La regla del repo pide
-- enumerar a quién se le DA el módulo, que es el INSERT de 1A.
BEGIN;

DELETE FROM public.role_modules WHERE module_slug = 'tasks';

DO $do$
DECLARE
  slug_nuevo   text := 'operations';
  slug_stratix text := 'stratix-mkt';
  cond         text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_nuevo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_nuevo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_stratix) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_stratix;
  END IF;

  -- `stratix-mkt` se QUEDA en el OR: la sección Team de Stratix cuenta las tareas en proceso de
  -- cada persona (RosterCard), y sacarlo dejaría ese contador en cero, sin ningún error, para
  -- quien tenga Stratix y no operations. Lo explica 20260903235201.
  cond := format('(public.has_module(%L) OR public.has_module(%L))', slug_nuevo, slug_stratix);

  EXECUTE 'DROP POLICY IF EXISTS "colaborador_read" ON public.actividades';
  EXECUTE format('CREATE POLICY "colaborador_read" ON public.actividades FOR SELECT USING %s', cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_insert_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_insert_modulo" ON public.actividades
                    FOR INSERT WITH CHECK %s', cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_update_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_update_modulo" ON public.actividades
                    FOR UPDATE USING %s WITH CHECK %s', cond, cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_delete_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_delete_modulo" ON public.actividades
                    FOR DELETE USING %s', cond);
END $do$;

-- El ámbito de los filtros ES el slug: `useFilters(MODULE.OPERATIONS, …)`. Sin esto, cada vista
-- guardada del PR #68 desaparece del desplegable sin un error.
UPDATE public.vistas_filtro SET ambito = 'operations' WHERE ambito = 'tasks';

COMMIT;
```

- [ ] **Paso 4: Aplicarla en local y verificar**

```bash
pnpm supabase migration up
pnpm supabase db query --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  "select module_slug, count(*) from role_modules where module_slug in ('tasks','operations') group by 1;"
```

Expected: una sola fila, `operations`. Cero filas de `tasks`.

- [ ] **Paso 5: Correr la e2e otra vez contra la base cerrada**

Run: `pnpm e2e e2e/operations-slug.spec.ts`
Expected: los dos PASS. Ahora sin la red de la convivencia.

- [ ] **Paso 6: Mostrar a Wagner y commitear**

```bash
git add supabase/migrations/*_operations_slug_cierra.sql
git commit -m "feat(db): retira el slug tasks"
```

- [ ] **Paso 7: El push a producción — sólo con la aprobación explícita de Wagner**

```bash
pnpm supabase migration list --linked   # ver TODO lo que se va a aplicar, no sólo esta
pnpm supabase db push
```

- [ ] **Paso 8: Verificar en producción**

```bash
pnpm supabase db query --linked \
  "select module_slug, count(*) from role_modules where module_slug in ('tasks','operations') group by 1;"
pnpm supabase db query --linked \
  "select ambito, count(*) from vistas_filtro group by 1;"
```

Expected: cero `tasks`, y ninguna `vistas_filtro` con `ambito='tasks'`.

Y a mano, en `app.stratixsolutions.us` con una cuenta **que no sea admin**: el tablero carga y las
vistas guardadas siguen en el desplegable.

---

## Cierre de la fase 1

- [ ] **Actualizar el CLAUDE.md**: la tabla de módulos dice `/tasks`, y el árbol de `src/app/(app)/`
      también. El párrafo de `deriveMiembrosAsignables` menciona el módulo `tasks` por nombre.
- [ ] **Anotar la deuda de `legacy.ts`** en el `.todo`: se borra cuando
      `select count(*) from role_modules where module_slug='tasks'` dé 0 en producción — que es
      después del paso 8. Borrarlo es un PR de tres líneas y no bloquea la fase 2.

## Lo que esta fase deja sin hacer

- `reuniones` sigue siendo su propio módulo, con su ruta y su slug. La absorción es la fase 3.
- `src/features/tasks/` sigue llamándose así. La mudanza es la fase 6.
- Las claves internas de UI (`PanelKey`, `SUB_ITEMS.tasks`, `NAV[].key`) siguen diciendo `tasks`.
- La preferencia de filtros guardada en el navegador de cada persona (`filtros:tasks` bajo
  `eminat:<userId>:`) **se pierde** — vuelve al default en el primer ingreso. No se puede migrar
  desde la base y no vale un shim: las vistas guardadas, que sí importan, viven en `vistas_filtro` y
  esas sí se migran. **Va dicho en la descripción del PR.**

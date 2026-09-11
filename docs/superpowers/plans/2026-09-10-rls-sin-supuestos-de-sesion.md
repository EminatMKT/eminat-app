# RLS sin supuestos de sesión — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que ninguna policy de `public` autorice por el solo hecho de tener una sesión, de modo que quién puede registrarse en el proyecto Supabase deje de ser parte del modelo de seguridad de eminat-app.

**Architecture:** Se agrega `es_personal()` — `is_admin()` sin el filtro de rol — como el predicado mínimo que responde "esta sesión pertenece a alguien del holding". Las dos policies que hoy dicen `qual: true` para `authenticated` (`usuarios`, `empresas`) pasan a usarlo. Un check de catálogo nuevo, al lado de `rls-encendida.sql`, deja el arreglo cerrado contra regresiones: falla el pre-push y el CI si vuelve a aparecer una policy permisiva sin calificar.

**Tech Stack:** Postgres 15 / Supabase, migraciones SQL en `supabase/migrations/`, checks de catálogo en `supabase/checks/` corridos por `pnpm db:rls`, e2e en Playwright contra PostgREST con roles reales (`e2e/`).

**Spec:** este plan no tiene spec previo — el hallazgo que lo origina está documentado en la sección "Contexto" de acá abajo, y esa sección es la autoridad.

## Contexto — el hallazgo (2026-09-10)

El proyecto Supabase de producción (`ruedelunbtaomhrzgelc`) no es exclusivo de eminat-app. Una segunda aplicación (`stratix-meet`, en `meet.stratixsolutions.us`) está desplegada contra el mismo proyecto y su login llama a `signInWithOtp` **sin `shouldCreateUser: false` y sin validación de dominio**. Cualquier dirección de correo del mundo obtiene hoy una sesión con rol `authenticated` en producción.

Verificado contra producción el 2026-09-10:

| tabla | policy | rol | `qual` | efecto para un forastero registrado |
|---|---|---|---|---|
| `usuarios` | `Lectura autenticada de usuarios` | `authenticated` | `true` | **lee las 17 filas × 25 columnas** |
| `usuarios` | `Lectura pública de usuarios` | `anon` | `true` | inerte: `anon` no tiene GRANT de SELECT |
| `empresas` | `empresas_read_authenticated` | `authenticated` | `true` | **lee las 14 filas** |
| `actividades` | `actividades_read_stratix_meet` | `authenticated` | `EXISTS(topics … t.user_id = auth.uid())` | nada |
| `actividades` | `actividades_update_stratix_meet` | `authenticated` | idem, con `with_check` | nada |
| `historial` | `historial_admin_read` | `public` | `is_admin()` | nada |
| `research_leads` | `mod_access` | `public` | `has_module('research')` | nada |

Tres de cuatro tablas propias ya autorizan por una propiedad de la persona (`is_admin()`, `has_module()`, pertenencia a la fila). Las dos de la primera mitad de la tabla autorizan por una propiedad de la **sesión**, y ese es el supuesto que se rompió desde afuera.

`empresas_read_authenticated` no fue escrita por este repo: viene textual del `schema.sql` de stratix-meet y se aplicó a mano en el SQL Editor.

**Fuera de alcance de este plan:** las 5 tablas (`meetings`, `topics`, `meeting_participants`, `tasks`, `profiles`) y las 2 policies `*_stratix_meet` que viven en producción sin migración. Adoptarlas o retirarlas depende de una decisión de producto que todavía no está tomada, y son un subsistema aparte. Va en su propio plan.

## Global Constraints

- Toda tabla de `public` nace con RLS encendida — `rules/base-de-datos.md` · "Una tabla nace con RLS encendida".
- Ninguna migración se edita después de aplicada; un cambio es una migración nueva.
- Los nombres de columna FK siguen `rules/datos.md` · "Nombres de columnas FK".
- No se commitea sin aprobación de Wagner: dejar el árbol listo, correr el gate, mostrar qué entra.
- El despliegue a producción es **una sola vez, al final** — salvo que Wagner decida lo contrario para este plan por ser un arreglo de seguridad (ver "Decisión pendiente").
- Los tests nuevos de RLS van en `e2e/` con roles reales contra PostgREST, no con `service_role`.
- Un `200` con lista vacía **no** es evidencia de que la RLS cerró: la RLS filtra, no rechaza. Toda aserción de cierre compara contra una lectura que sí debería traer filas, o contra un status ≥ 401.

## Decisión pendiente (Wagner, antes de la Tarea 5)

`feat/operations` tiene la fase 2 planificada y la convivencia de slugs abierta. Este plan toca `usuarios` y `empresas`, que la fase 2 no toca. Hay dos caminos y no son equivalentes:

- **A** — Rama propia `fix/rls-sin-supuestos`, merge y deploy solo, antes de la fase 2. Cierra el agujero en horas; rompe la regla de "un solo deploy al final".
- **B** — Se suma a `feat/operations` y sale con el deploy único. Respeta la cadencia; deja el agujero abierto los días que falten.

El plan está escrito para que las dos funcionen: no depende de nada de `operations`.

## File Structure

| archivo | responsabilidad |
|---|---|
| `e2e/seed.ts` (modificar) | se le agrega `ensureForastero()`: crea el usuario de auth **sin** fila en `usuarios`. Es el único helper que faltaba para poder representar en un test a alguien que se registró por stratix-meet. |
| `e2e/forastero-rls.spec.ts` (crear) | el spec que describe qué ve y qué no ve una sesión sin fila en `usuarios`. Es el test de regresión del incidente. |
| `supabase/migrations/<ts>_es_personal_y_usuarios.sql` (crear) | `es_personal()` + reemplazo de las dos policies de `usuarios`. |
| `supabase/migrations/<ts>_empresas_es_personal.sql` (crear) | reemplazo de la policy de `empresas`. Separada porque se puede rechazar una y aprobar la otra. |
| `supabase/checks/policies-sin-qual-true.sql` (crear) | check de catálogo: ninguna policy permisiva para `anon`/`authenticated` con predicado `true`. Mismo idioma que `rls-encendida.sql`, con su array de deuda visible. |
| `supabase/checks/rls.sh` (modificar) | corre el check nuevo además del que ya corre. |
| `rules/base-de-datos.md` (modificar, vía subagente) | la regla que hace que esto no vuelva a pasar por revisión humana. |

---

### Task 1: El forastero, y el test que hoy está en rojo

**Files:**
- Modify: `e2e/seed.ts` (agregar export al final, junto a los demás helpers)
- Create: `e2e/forastero-rls.spec.ts`

**Interfaces:**
- Consumes: `PASSWORD`, `H`, `authIdByEmail`, `deleteUser` de `e2e/seed.ts`; `URL`, `ANON` de `e2e/constants.ts`; `rest.token`, `rest.como` de `e2e/rest.ts`.
- Produces: `ensureForastero(email: string): Promise<string>` — crea el auth user confirmado y devuelve su `auth_id`, **sin** insertar en `usuarios`. `deleteUser()` ya lo limpia: busca la fila de `usuarios`, no la encuentra, y borra el auth user igual.

- [ ] **Step 1: Escribir el helper `ensureForastero`**

En `e2e/seed.ts`, al final del archivo:

```ts
// Alguien con sesión válida y SIN fila en `usuarios`: exactamente lo que produce un registro
// por `signInWithOtp` desde una app que comparte este proyecto de auth. No es un caso
// hipotético — el 2026-09-10 había una app así en producción. `deleteUser()` lo limpia sin
// cambios: no encuentra fila en usuarios y borra el auth user igual.
export async function ensureForastero(email: string): Promise<string> {
  let auth_id = await authIdByEmail(email)
  if (!auth_id) {
    const r = await fetch(`${URL}/auth/v1/admin/users`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
    })
    const j = await r.json()
    auth_id = j.id ?? (await authIdByEmail(email))
  } else {
    await fetch(`${URL}/auth/v1/admin/users/${auth_id}`, {
      method: 'PUT', headers: H,
      body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
    })
  }
  if (!auth_id) throw new Error(`ensureForastero ${email}: no se pudo crear el auth user`)
  return auth_id
}
```

- [ ] **Step 2: Escribir el spec que falla**

Crear `e2e/forastero-rls.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { PASSWORD, ensureForastero, ensureUser, deleteUser } from './seed'
import { URL, ANON } from './constants'
import rest from './rest'

// Qué prueba este archivo: que tener una sesión no es, por sí solo, una autorización.
// El 2026-09-10 lo era: `usuarios` y `empresas` tenían policies con `qual: true` para
// `authenticated`, y una segunda app sobre el mismo proyecto repartía sesiones a cualquier
// correo. Estos tests describen el cierre; si alguno se pone verde por accidente (porque
// alguien revoque un GRANT en vez de arreglar la policy), el test de contraste lo agarra.
const FORASTERO = 'forastero.rls@ejemplo-externo.com'  // sin fila en `usuarios`, a propósito
const PERSONAL = 'personal.rls@eminat.net'             // con fila: el contraste

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await ensureForastero(FORASTERO)
  await ensureUser(PERSONAL, 'sin_asignar')
})

test.afterAll(async () => {
  await deleteUser(FORASTERO)
  await deleteUser(PERSONAL)
})

test('un forastero con sesión no lee el directorio de usuarios', async ({ request }) => {
  const jwt = await rest.token(request, FORASTERO, PASSWORD)
  const r = await request.get(`${URL}/rest/v1/usuarios?select=id,email`, { headers: rest.como(jwt) })
  expect(r.ok(), 'la llamada tiene que resolver, no explotar').toBe(true)
  expect(await r.json(), 'cero filas: no tiene fila en usuarios').toEqual([])
})

test('un forastero con sesión no lee las empresas', async ({ request }) => {
  const jwt = await rest.token(request, FORASTERO, PASSWORD)
  const r = await request.get(`${URL}/rest/v1/empresas?select=id`, { headers: rest.como(jwt) })
  expect(r.ok()).toBe(true)
  expect(await r.json(), 'cero filas').toEqual([])
})

// El contraste, y la parte que impide el falso verde: si el cierre se hubiera hecho revocando
// el GRANT en vez de calificando la policy, estos dos también darían cero y el arreglo habría
// roto la app para todo el mundo sin que ningún test lo dijera.
test('alguien del personal SÍ lee el directorio y las empresas', async ({ request }) => {
  const jwt = await rest.token(request, PERSONAL, PASSWORD)
  const u = await request.get(`${URL}/rest/v1/usuarios?select=id`, { headers: rest.como(jwt) })
  expect((await u.json()).length, 'el personal ve el directorio').toBeGreaterThan(0)
  const e = await request.get(`${URL}/rest/v1/empresas?select=id`, { headers: rest.como(jwt) })
  expect((await e.json()).length, 'el personal ve las empresas').toBeGreaterThan(0)
})

test('anon no llega a usuarios ni con la llave del bundle', async ({ request }) => {
  const r = await request.get(`${URL}/rest/v1/usuarios?select=id`, { headers: { apikey: ANON } })
  expect(r.status(), 'el GRANT de anon está revocado: rebota, no devuelve []').toBeGreaterThanOrEqual(401)
})
```

- [ ] **Step 3: Correr el spec y verificar que los dos primeros fallan**

```bash
pnpm e2e e2e/forastero-rls.spec.ts
```

Esperado: **FAIL** en "no lee el directorio de usuarios" (devuelve las filas del seed local, no `[]`) y en "no lee las empresas". Los otros dos en verde.

Si el de `usuarios` pasa en local, el local está drifteado respecto de producción: verificá con
`psql "$SUPABASE_DB_URL" -c "select policyname, roles, qual from pg_policies where tablename='usuarios'"`
que la policy local también diga `true`. Si no, replicá primero el estado de producción — un test que nace verde no prueba nada.

- [ ] **Step 4: Commit**

```bash
git add e2e/seed.ts e2e/forastero-rls.spec.ts
git commit -m "test(rls): el forastero con sesión, y las dos lecturas que hoy no debería tener"
```

---

### Task 2: `es_personal()` y el cierre de `usuarios`

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_es_personal_y_usuarios.sql`
- Test: `e2e/forastero-rls.spec.ts` (ya escrito en la Tarea 1)

**Interfaces:**
- Consumes: `public.usuarios(auth_id)`, `auth.uid()`.
- Produces: `public.es_personal() → boolean`, `STABLE SECURITY DEFINER`. La Tarea 3 la reusa tal cual.

- [ ] **Step 1: Escribir la migración**

Generá el timestamp con `date -u +%Y%m%d%H%M%S` y creá el archivo con ese nombre:

```sql
-- `es_personal()`: ¿esta sesión pertenece a alguien del holding?
--
-- Por qué existe: hasta hoy, `usuarios` y `empresas` autorizaban con `qual: true` para
-- `authenticated`. Eso era correcto mientras la única puerta a una sesión fuera el login de
-- eminat-app, que valida el dominio del correo contra `dominios_corporativos`. El 2026-09-10 se
-- encontró una segunda app desplegada sobre el MISMO proyecto de Supabase, con registro abierto
-- a cualquier dominio: el supuesto se rompió desde afuera, sin que cambiara una línea de este
-- repo. Una policy que depende de quién puede sacar una sesión es frágil aunque hoy se cumpla.
--
-- Es `is_admin()` sin el filtro de rol, a propósito: mismo idioma, misma forma, mismo motivo
-- de ser SECURITY DEFINER. Sin SECURITY DEFINER, una policy sobre `usuarios` que consulta
-- `usuarios` entra en recursión infinita de RLS.
create or replace function public.es_personal() returns boolean
  language sql stable security definer
  as $$
  select exists (select 1 from public.usuarios u where u.auth_id = auth.uid());
$$;

alter function public.es_personal() owner to postgres;

comment on function public.es_personal() is
  'true si auth.uid() tiene fila en usuarios. Predicado mínimo de pertenencia: reemplaza al '
  '`qual: true` sobre `authenticated`, que asumía que toda sesión era de un empleado.';

-- `usuarios`: la lectura del directorio pasa a exigir pertenencia.
--
-- Nada cambia para quien ya usaba la app: si tenés fila en `usuarios`, seguís viendo lo mismo.
-- Lo que deja de ver el directorio es una sesión sin fila — que hasta hoy no existía por diseño.
drop policy if exists "Lectura autenticada de usuarios" on public.usuarios;
create policy "Lectura autenticada de usuarios" on public.usuarios
  for select to authenticated using (public.es_personal());

-- `Lectura pública de usuarios` era `{anon} qual: true`. Hoy es inerte porque `anon` no tiene
-- GRANT de SELECT sobre la tabla (`20260831214348_revocar_anon_vistas.sql`). Se borra igual: una
-- policy abierta que sólo está tapada por un GRANT es un arma cargada — el día que alguien
-- vuelva a dar el GRANT, la tabla se abre sin que nadie toque una policy.
drop policy if exists "Lectura pública de usuarios" on public.usuarios;
```

- [ ] **Step 2: Aplicar y correr el test**

```bash
supabase db reset
pnpm e2e e2e/forastero-rls.spec.ts
```

Esperado: "no lee el directorio de usuarios" pasa a **PASS**. "no lee las empresas" sigue en **FAIL** (es la Tarea 3). Los dos de contraste, en verde — en particular "alguien del personal SÍ lee": si ése se puso rojo, `es_personal()` está mal y cerraste la app para todos.

- [ ] **Step 3: Verificar que la función no rompe `admin_all`**

```bash
psql "${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" \
  -c "select policyname, roles, qual from pg_policies where schemaname='public' and tablename='usuarios' order by policyname"
```

Esperado: cuatro policies — `Lectura autenticada de usuarios` con `es_personal()`, `admin_all` con `is_admin()`, `usuario_own_profile` y `usuario_update_propio` con `auth_id = auth.uid()`. **No** debe aparecer `Lectura pública de usuarios`.

- [ ] **Step 4: Correr la suite completa**

```bash
pnpm test && pnpm typecheck && pnpm db:rls && pnpm e2e
```

Esperado: todo verde salvo los dos tests de `empresas` de la Tarea 1, que siguen rojos por diseño.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_es_personal_y_usuarios.sql
git commit -m "feat(rls): es_personal() y el directorio deja de abrirse por tener sesión"
```

---

### Task 3: El cierre de `empresas`

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_empresas_es_personal.sql`
- Test: `e2e/forastero-rls.spec.ts` (ya escrito)

**Interfaces:**
- Consumes: `public.es_personal()` de la Tarea 2.
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Leer el `qual` de la OTRA policy de `empresas` antes de tocar nada**

`empresas` tiene dos policies de SELECT para `authenticated`. Este plan sólo conoce el `qual` de una. Si la otra también es `true`, arreglar sólo la primera no cambia nada: las policies permisivas se suman con OR.

```bash
psql "${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" \
  -c "select policyname, cmd, roles, qual from pg_policies where schemaname='public' and tablename='empresas' order by policyname"
```

Anotá las dos salidas. Si `empresas_select_authenticated` también tiene `qual: true`, el Step 2 la incluye; si tiene un predicado propio, el Step 2 la deja intacta y sólo borra la de stratix-meet.

- [ ] **Step 2: Escribir la migración**

```sql
-- `empresas`: la lectura pasa a exigir pertenencia, igual que `usuarios`.
--
-- `empresas_read_authenticated` no salió de este repo: vino textual del `schema.sql` de
-- stratix-meet, que la traía como instrucción en un comentario, y se aplicó a mano en el SQL
-- Editor el 2026-09-10. `using (true)` para `authenticated`, sin calificar.
drop policy if exists "empresas_read_authenticated" on public.empresas;

-- Si el Step 1 mostró que `empresas_select_authenticated` también es `qual: true`, descomentá
-- estas dos líneas. Si tiene predicado propio, dejalas comentadas: no es esta la que abre.
-- drop policy if exists "empresas_select_authenticated" on public.empresas;
-- create policy "empresas_select_authenticated" on public.empresas
--   for select to authenticated using (public.es_personal());

create policy "empresas_read_personal" on public.empresas
  for select to authenticated using (public.es_personal());
```

- [ ] **Step 3: Aplicar y correr el test**

```bash
supabase db reset
pnpm e2e e2e/forastero-rls.spec.ts
```

Esperado: los cuatro tests en **PASS**.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/*_empresas_es_personal.sql
git commit -m "feat(rls): empresas deja de abrirse por tener sesión"
```

---

### Task 4: El check que impide la regresión

**Files:**
- Create: `supabase/checks/policies-sin-qual-true.sql`
- Modify: `supabase/checks/rls.sh` (última línea, antes del `echo` de éxito)

**Interfaces:**
- Consumes: nada del código de la app; lee `pg_policies`.
- Produces: un `RAISE EXCEPTION` que rompe `pnpm db:rls`, el pre-push y el job e2e del CI.

- [ ] **Step 1: Escribir el check**

Crear `supabase/checks/policies-sin-qual-true.sql`:

```sql
-- Ninguna policy permisiva para `anon` o `authenticated` puede tener el predicado `true`.
--
-- Por qué existe este archivo: el 2026-09-10 se encontró que `usuarios` (17 filas, 25 columnas)
-- y `empresas` se abrían a cualquier sesión `authenticated` por `qual: true`. Eso fue correcto
-- mientras el único emisor de sesiones fuera el login de eminat-app, que valida el dominio del
-- correo. Dejó de serlo cuando una segunda app sobre el mismo proyecto de Supabase empezó a
-- registrar a cualquiera. El agujero no se abrió tocando la base: se abrió cambiando quién podía
-- sacar una sesión, que es una decisión que puede tomar alguien que no tiene acceso a este repo.
--
-- La regla: una policy autoriza por una propiedad de la PERSONA (`is_admin()`, `has_module()`,
-- `es_personal()`, pertenencia a la fila), nunca por el hecho de tener sesión.
--
-- La regla y su motivo viven en rules/base-de-datos.md · "Una policy no autoriza por tener sesión".

DO $$
DECLARE
  -- DEUDA VISIBLE: cada fila acá es una policy que autoriza por tener sesión. Se arregla
  -- borrando el nombre, nunca agregándolo. Vacía es el estado correcto.
  conocidas text[] := ARRAY[]::text[];
  culpables text;
BEGIN
  SELECT string_agg(format('%s.%s', p.tablename, p.policyname), E'\n  ' ORDER BY p.tablename, p.policyname)
    INTO culpables
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.permissive = 'PERMISSIVE'
    AND p.roles && ARRAY['anon', 'authenticated']::name[]
    AND (
      btrim(coalesce(p.qual, 'true')) = 'true'
      OR btrim(coalesce(p.with_check, '')) = 'true'
    )
    AND NOT (format('%s.%s', p.tablename, p.policyname) = ANY (conocidas));

  IF culpables IS NOT NULL THEN
    RAISE EXCEPTION E'Policies que autorizan por tener sesión:\n  %\n\n%',
      culpables,
      'Una policy `using (true)` sobre `anon`/`authenticated` delega la seguridad en quién '
      'puede registrarse en el proyecto Supabase — y eso se decide fuera de este repo. '
      'Calificá por una propiedad de la persona: es_personal(), has_module(), is_admin(), o '
      'la relación con la fila. Ver rules/base-de-datos.md.';
  END IF;
END $$;
```

Nota sobre `coalesce(p.qual, 'true')`: una policy de `INSERT` tiene `qual` en `NULL` y sólo `with_check`. Tratar el `NULL` como `'true'` es correcto — un `qual` ausente no restringe — pero para `INSERT` la que decide es `with_check`, y por eso está la segunda condición.

- [ ] **Step 2: Correr el check y verificar que pasa**

```bash
psql "${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" \
  -v ON_ERROR_STOP=1 -q -f supabase/checks/policies-sin-qual-true.sql
```

Esperado: sin salida y exit 0 — las Tareas 2 y 3 ya limpiaron las dos culpables.

- [ ] **Step 3: Verificar que el check sabe fallar**

Un check que nunca se vio en rojo no es un check. Ensuciá a propósito, corré, y revertí:

```bash
PSQL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
psql "$PSQL" -c "create policy \"canario\" on public.empresas for select to authenticated using (true)"
psql "$PSQL" -v ON_ERROR_STOP=1 -q -f supabase/checks/policies-sin-qual-true.sql   # tiene que EXPLOTAR
psql "$PSQL" -c "drop policy \"canario\" on public.empresas"
```

Esperado: el segundo comando falla con `Policies que autorizan por tener sesión: empresas.canario`. Si pasa en verde, el check está mal y no protege nada.

- [ ] **Step 4: Engancharlo a `pnpm db:rls`**

En `supabase/checks/rls.sh`, reemplazar las dos últimas líneas por:

```sh
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -q -f "$(dirname "$0")/rls-encendida.sql"
echo "✓ rls: toda tabla de public tiene RLS encendida (salvo la deuda declarada en el .sql)"

psql "$PSQL_URL" -v ON_ERROR_STOP=1 -q -f "$(dirname "$0")/policies-sin-qual-true.sql"
echo "✓ rls: ninguna policy autoriza por el solo hecho de tener sesión"
```

- [ ] **Step 5: Correr el gate entero**

```bash
pnpm test && pnpm typecheck && pnpm db:rls && pnpm e2e && pnpm rules:check
```

Esperado: todo verde, con las dos líneas nuevas de `✓ rls:` en la salida.

- [ ] **Step 6: Commit**

```bash
git add supabase/checks/policies-sin-qual-true.sql supabase/checks/rls.sh
git commit -m "feat(checks): el pre-push frena una policy que autoriza por tener sesión"
```

---

### Task 5: La regla escrita

**Files:**
- Modify: `rules/base-de-datos.md` — **vía subagente**, no en el hilo principal

**Interfaces:** ninguna.

- [ ] **Step 1: Preguntarle a Wagner el cajón**

Es lo único que no se deduce solo, y decide si el estándar se propaga a los otros repos o queda encerrado en éste. Usar `AskUserQuestion` con las opciones enumeradas: `universal`, el cajón del stack, o el `rules/` del repo. Para esta regla, el `rules/` del repo es el default razonable (habla de `es_personal()`, que es de acá), pero la forma general —"una policy no autoriza por tener sesión"— es candidata a `universal`.

- [ ] **Step 2: Delegar la escritura**

Despachar un subagente con la skill `regla-nueva` cargada, pasándole el cajón ya decidido. Hacerlo en el hilo principal está frenado por un hook, y además cuesta contexto que no hace falta gastar acá. Pedirle de vuelta sólo el cierre: archivo tocado, título de la sección, y qué dijeron `--self-check` y `--auditoria`.

Título propuesto para la sección: **"Una policy no autoriza por tener sesión"**. Contenido: el predicado tiene que mirar una propiedad de la persona (`is_admin()`, `has_module()`, `es_personal()`, pertenencia a la fila), nunca `true` sobre `anon`/`authenticated`. Motivo: quién puede obtener una sesión se decide fuera del repo — el 2026-09-10 lo decidió una segunda app desplegada sobre el mismo proyecto.

- [ ] **Step 3: Registrar el número de la auditoría**

`centinela --auditoria "Una policy no autoriza por tener sesión"` dice cuántos archivos la incumplen hoy. Una regla escrita sin ese número es una aspiración. Debería dar 0 después de las Tareas 2 y 3; si da más, hay policies que este plan no vio.

- [ ] **Step 4: Commit**

El subagente deja el archivo; el commit lo hace el hilo principal con la aprobación de Wagner.

```bash
git add rules/base-de-datos.md
git commit -m "docs(rules): una policy no autoriza por tener sesión"
```

---

## Self-Review

**Cobertura del contexto:** las dos policies con `qual: true` del hallazgo tienen tarea (2 y 3). La policy inerte de `anon` sobre `usuarios` se borra en la Tarea 2. Las tres que están bien (`actividades` ×2, `historial`, `research_leads`) no se tocan, y el check de la Tarea 4 las deja pasar porque ninguna tiene predicado `true`. Las 5 tablas y 2 policies huérfanas están declaradas fuera de alcance con su motivo.

**Placeholders:** el único condicional del plan es el Step 2 de la Tarea 3, y está resuelto con un comando concreto en el Step 1 que produce la respuesta antes de escribir la migración. No es un "TBD": es una lectura que el plan no podía hacer porque requiere psql contra la base.

**Consistencia de tipos:** `es_personal()` se define en la Tarea 2 y se consume con el mismo nombre y sin argumentos en las Tareas 3 y 4. `ensureForastero(email)` se define en la Tarea 1 y se consume en el mismo archivo. `rest.token` / `rest.como` se usan con la firma real de `e2e/rest.ts`.

**Lo que este plan NO arregla, y hay que decirlo:** cierra el agujero del lado de la base. No cierra el registro abierto de `meet.stratixsolutions.us`, que es una línea en otro repo (`components/AuthGate.tsx`, agregar `shouldCreateUser: false`). Las dos cosas son independientes y conviene hacer las dos: ésta protege aunque mañana aparezca una tercera app sobre el mismo proyecto.

---

# Runbook de despliegue

*Escrito el 11/09/2026, con las cinco tareas hechas y commiteadas en `fix/rls-sin-supuestos`. Producción **no** tiene nada de esto aplicado.*

## Dónde quedamos — 10/09/2026, 22:00

Las cinco tareas del plan están **hechas y commiteadas**. Lo que sigue es desplegarlas.

- [ ] **Paso 0** · Apagar `Allow new users to sign up` — *pantalla abierta, faltan los dos clics*
- [ ] **Paso 1** · Reinstalar el CLI de Supabase (`db reset` roto: falta el binario `supabase-go`)
- [ ] **Paso 2** · `select count(*) from usuarios where auth_id is null and activo` contra producción
- [ ] **Paso 3** · Merge a `main` + `supabase db push`
- [ ] **Paso 4** · Verificar en producción, con cuenta **no admin**
- [ ] **Paso 5** · *(sólo si algo sale mal)* el rollback
- [ ] **Paso 6** · Merge a `feat/operations` + re-fechar las tres `20260909*`

**El paso 0 es lo único urgente.** Una vez hecho, el agujero está cerrado y los otros seis pueden esperar el tiempo que haga falta: son la defensa durable, no la emergencia.

### Lo que ya está resuelto y no hay que volver a mirar

| | |
|---|---|
| Las tres migraciones | escritas, aplicadas a local, probadas |
| `e2e/forastero-rls.spec.ts` | 5 tests, verdes |
| El check del pre-push | verde, con 5 canarios — incluido el falso positivo de INSERT que tenía y se corrigió en `a6fb4a1` |
| El rollback | escrito **y corrido** contra local |
| La regla del centinela | commiteada en el repo de datos (`435cbfd`), con su hueco del `TO` anotado en el backlog de `centinela` |
| El informe de comparación | `docs/operaciones/2026-09-10-comparacion-stratix-meet.md` |

### Lo que quedó sin verificar, y hay que saberlo

- **Las tres migraciones nunca se aplicaron sobre una base construida desde el primer archivo.** `supabase db reset` está roto; se aplicaron con `psql` sobre el local. De ahí que el paso 1 vaya antes que el 3.
- **La UI nunca se probó con una cuenta no-admin.** El e2e lo cubre a nivel API; en el navegador sólo se probó como admin, que puentea `usuarios` por `admin_all`. No se pudo hacer en local porque la base local está adelante del código de esta rama (tiene el slug `operations`, el catálogo de `main` no lo conoce, y eso revienta `RoleCard.tsx:34`).

### Y lo que no es de este plan pero sigue abierto

- `shouldCreateUser: false` en `components/AuthGate.tsx` de `stratix-meet` — otro repo, una línea.
- Las 5 tablas huérfanas en producción (`meetings`, `topics`, `meeting_participants`, `tasks`, `profiles`) y las 2 policies `*_stratix_meet`, que no están en ningún repositorio. Decisión de producto, plan aparte.
- La conversación con Freddy: guion y contexto en `~/Documentos/conversacion-freddy-2026-09-10.md`, fuera de todo repo a propósito.

---

## Estado del que parte

| | |
|---|---|
| Rama | `fix/rls-sin-supuestos`, 8 commits sobre `main` |
| Historial de migraciones en producción | al nivel de `main` — **ninguna** `20260909*` de operations fue aplicada |
| Local | tiene las tres `20260909*` aplicadas (de un reset viejo estando en `feat/operations`) y las tres `20260911*` aplicadas a mano con `psql` |
| Agujero en producción | **abierto**, salvo que ya se haya apagado el registro en el proyecto |

## Paso 0 — Lo que va antes que todo, y no cuesta nada

Apagar **`Authentication → Sign In / Providers → Allow new users to sign up`** en el proyecto `ruedelunbtaomhrzgelc`.

No rompe eminat-app: los usuarios se crean con `admin.createUser()` (`src/app/api/admin/create-user/route.ts:192`), que usa `service_role` y no pasa por esa perilla. No rompe `stratix-meet` para quien ya la usa: con signups apagados, `signInWithOtp` sobre un correo que ya existe sigue mandando el enlace.

**Esto cierra el agujero.** Todo lo que sigue es la defensa durable, y ya no es urgente una vez hecho el paso 0.

## Paso 1 — Arreglar el CLI

```bash
supabase --version      # hoy: 2.110.0, binario de julio en ~/.local/bin/supabase
```

`supabase db reset` falla con `LegacyDbBootstrapError: Could not find the supabase-go binary`. Reinstalar el CLI destraba tres cosas que vas a necesitar: el `db push` del paso 3, el re-fechado del paso 6, y la verificación desde cero que nunca pudimos hacer (las tres migraciones **jamás se aplicaron sobre una base construida desde el primer archivo**).

Verificación: `supabase db reset` termina sin error y `pnpm db:rls` da verde sobre esa base.

## Paso 2 — El chequeo que sí puede lastimar

Contra **producción**:

```sql
select id, email from public.usuarios where auth_id is null and activo;
```

- **0 filas** → seguí.
- **Cualquier fila** → **PARÁ**. `es_personal()` devuelve false para esas personas y van a perder el directorio, las empresas y los catálogos en cuanto apliques. El arreglo es rellenarles el `auth_id` (ver `20260709120000_backfill_usuarios_auth_id.sql`), no revertir el plan.

En local da 0 sobre 7 activos. Producción tiene 17.

## Paso 3 — Merge y push

```bash
git switch main && git pull --ff-only
git merge --no-ff fix/rls-sin-supuestos
supabase db push
```

`db push` debería aplicar exactamente tres versiones: `20260911013928`, `20260911014138`, `20260911014505`. Si propone alguna más, **cancelá** y averiguá por qué antes de seguir.

Mirá los `RAISE NOTICE`: las ocho líneas `calificada y revocada: <tabla>`. Si una guarda salta, la transacción revierte sola y no quedás a mitad de camino — ese es el diseño.

## Paso 4 — Verificar en producción

```sql
-- (a) no queda ninguna policy que autorice por tener sesión
select tablename, policyname, roles, qual
from pg_policies
where schemaname = 'public' and permissive = 'PERMISSIVE'
  and roles && array['anon','authenticated']::name[]
  and (btrim(coalesce(qual,'true')) = 'true' or btrim(coalesce(with_check,'')) = 'true');
-- esperado: 0 filas

-- (b) anon quedó afuera y authenticated adentro
select c.relname,
       has_table_privilege('anon', c.oid, 'SELECT')          as anon,
       has_table_privilege('authenticated', c.oid, 'SELECT') as auth
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname in ('usuarios','empresas','cargos','departamentos','equipos',
                    'jornadas','roles','role_modules','usuario_cargos','vinculaciones')
order by 1;
-- esperado: anon = false en las diez, auth = true en las diez
```

Y después, en el navegador, con una cuenta **no admin** (admin puentea `usuarios` por `admin_all`):

- El directorio del panel de admin lista gente.
- `Admin → Organización → Empresas` lista las empresas.
- Ninguna pantalla queda en blanco ni tira `TypeError`.

Esta pasada es la que no se pudo hacer en local, porque la base local está adelante del código de esta rama (tiene el slug `operations` y el catálogo de `main` no lo conoce, y eso revienta `RoleCard.tsx:34`).

## Paso 5 — Si algo salió mal

```bash
psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/rollback/rls-sin-supuestos-rollback-20260911.sql
```

Devuelve las diez policies a `using (true)` y la app vuelve a funcionar en el acto. Probado contra local el 11/09.

**No revierte los `REVOKE ... FROM anon` ni la policy `Lectura pública de usuarios`, a propósito** — revertirlos sería reabrir un agujero peor que el que el rollback viene a apagar. El archivo explica por qué.

Ojo: después de revertir, **`pnpm db:rls` falla a propósito**. Estás en un estado que la regla prohíbe. Para poder pushear en ese intervalo, agregá los nombres al array `conocidas` de `supabase/checks/policies-sin-qual-true.sql` en un commit aparte que diga por qué, y borralos cuando el arreglo real entre.

## Paso 6 — Traerlo a `feat/operations`

```bash
git switch feat/operations
git merge main
```

Trae las policies, el check y el rollback. Ninguna de las tres migraciones de operations crea una policy sin calificar, así que **el check nuevo pasa después del merge** (verificado el 11/09 sobre `main..feat/operations`).

**Y acá va el re-fechado.** Las tres de operations son `20260909*`, anteriores a las `20260911*` que ya van a estar aplicadas en producción. Renombralas a timestamps posteriores a `20260911014505`:

```
20260909222149_operations_slug_abre.sql
20260909230000_temas_catalogo.sql
20260909233746_operations_slug_cierra.sql
```

Es libre: nunca se aplicaron a producción. Ya estaba previsto para la de cierre en el plan de la fase 2 (*"se re-fecha al final para que sea la última aplicada"*); ahora aplica a las tres.

**Esto te va a desincronizar el local**, que sí las tiene en su historial con los nombres viejos. Se arregla con `supabase db reset` — de ahí que el paso 1 vaya primero.

## Lo que este runbook no cubre

- **`shouldCreateUser: false` en `stratix-meet`.** Otro repo, una línea, y es la mitad de Freddy. El paso 0 lo hace innecesario para cerrar el agujero, pero conviene igual.
- **Las 5 tablas huérfanas en producción** (`meetings`, `topics`, `meeting_participants`, `tasks`, `profiles`) y las 2 policies `*_stratix_meet`, que no están en ningún repositorio. Adoptarlas o retirarlas es una decisión de producto y va en su propio plan.
- **Los DEFAULT PRIVILEGES de `public`**, que siguen otorgando `arwdDxtm` a `anon` sobre toda relación nueva. Es la causa raíz de que `anon` tuviera SELECT sobre las diez tablas; lo denunció `20260831214348_revocar_anon_vistas.sql` y sigue vivo. Cada tabla nueva nace con ese privilegio hasta que se cierre.

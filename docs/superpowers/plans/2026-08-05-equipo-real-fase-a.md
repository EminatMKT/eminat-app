# Equipo real (Fase A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Des-hardcodear el equipo de Stratix creando la estructura organizacional real (`equipos`, `cargos`) y haciendo que la pestaña *Team*, los lookups `responsable_ref → nombre` y el dropdown de asignables salgan de `usuarios` en vez de constantes hardcodeadas.

**Architecture:** Una migración crea `equipos`/`cargos` y le agrega a `usuarios` las FK `equipo_id`/`cargo_id` (dropeando las redundantes `departamento_id`/`cargo`). Un seed de dev/local carga el roster de marketing como usuarios reales. En la app, tres helpers puros derivan de `usuarios` lo que antes daban `MIEMBROS_REFS`/`ACTIVE_MIEMBROS_REFS`/`STRATIX360_ROSTER`; se exponen por `AppContext` y los consumidores los leen vía `useApp()`.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, Supabase (Postgres) local vía Docker, CLI de Supabase, Vitest.

## Global Constraints

- **Todo se prueba en el Supabase LOCAL (Docker) primero.** No tocar dev remoto (`ydcadspinryybextlvyi`) ni prod (`ruedelunbtaomhrzgelc`) en este plan. El push a remoto y el PR a `main` ocurren al final de toda la cadena de specs (A → A.2 → B → C), no aquí.
- **Un solo PR al final de la cadena.** Cada tarea commitea a `development`; no se abre PR en este plan.
- Migraciones nuevas con `pnpm supabase migration new <nombre>`; aplicar a local con `pnpm supabase db push --local`.
- psql local: `docker exec -i supabase_db_eminat-app psql -U postgres -d postgres -c "<SQL>"`.
- Convención de nombres FK (CLAUDE.md): `_id` = FK a surrogate uuid; nombre natural sin `_id` = FK a clave legible. `equipo_id`/`cargo_id` son surrogate → llevan `_id`.
- `usuarios.rol` es FK a `roles.key`; los seeds deben usar un `rol` que exista en `roles` (ej. `stratix360`).
- No dropear `id_sheet` ni `responsable_ref` en esta fase (son puente de join; caen en Fase B). Referencia completa de redundancias: `docs/superpowers/specs/2026-08-04-equipo-real-fase-a-design.md` §3.1.

---

## File Structure

**DB (nuevo):**
- `supabase/migrations/<ts>_estructura_equipos_cargos.sql` — esquema `equipos`/`cargos`, FK en `usuarios`, seed de catálogos, migración genérica de datos y drops. Versionada (irá a dev/prod en la Fase final).
- `supabase/seed/equipo_marketing_dev.sql` — seed del roster de marketing. **Solo dev/local**, NO versionado como migración.

**App (nuevo):**
- `shared/context/team-derivations.ts` — helpers puros que derivan de `usuarios`.
- `shared/context/team-derivations.test.ts` — sus tests.

**App (modificado):**
- `shared/data/usuarios.ts` — embed de `equipos`/`departamentos`/`cargos` en `listActivos`.
- `shared/context/AppContext.tsx` — expone `miembrosRef`/`miembrosAsignables`/`equipoMarketing`; deja de re-exportar `MIEMBROS_REFS`.
- `shared/constants/domain.ts` — elimina `MIEMBROS_REFS`.
- `features/stratix-mkt/team.ts` — elimina `ACTIVE_MIEMBROS_REFS` (y el archivo entero si queda sin uso).
- `features/stratix-mkt/hooks/useStratixData.ts` — lee derivaciones del contexto.
- `features/stratix-mkt/components/{gantt/GanttBar,kanban/KanbanTaskCard,solicitudes/TaskTableRow,solicitudes/SolicitudesAvailabilityView,modals/ActivityDetailModal,modals/NewActivityModal,reporte/ReporteTab}.tsx` — íd.
- `features/stratix-mkt/components/roster/{Stratix360Roster,RosterCard}.tsx` — lista plana desde `usuarios`.

**App (eliminado):**
- `features/stratix-mkt/components/roster/roster-data.ts`.

---

## Task 1: Migración de esquema — `equipos`/`cargos` + FK en `usuarios` + drops

**Files:**
- Create: `supabase/migrations/<ts>_estructura_equipos_cargos.sql`

**Interfaces:**
- Produces: tablas `public.cargos(id, codigo, nombre, activo, created_at)`, `public.equipos(id, codigo, nombre, departamento_id, lider_id, activo, created_at)`; columnas `public.usuarios.equipo_id`, `public.usuarios.cargo_id`; departamento `MKT`, equipo `MKT-GEN`, 7 `cargos`. Elimina `usuarios.departamento_id` y `usuarios.cargo`.

- [ ] **Step 1: Levantar el Supabase local (está apagado)**

Run: `pnpm supabase start`
Expected: arranca los contenedores; imprime API URL y `service_role key`. Verificar contenedor DB:
`docker ps --format '{{.Names}}' | grep supabase_db_eminat-app` → devuelve la línea.

- [ ] **Step 2: Crear el archivo de migración**

Run: `pnpm supabase migration new estructura_equipos_cargos`
Expected: crea `supabase/migrations/<ts>_estructura_equipos_cargos.sql` vacío.

- [ ] **Step 3: Escribir la migración**

Pegar en el archivo creado:

```sql
-- Fase A — estructura organizacional administrable.
-- departamento 1—* equipo (con líder) —* usuarios (equipo_id = única membresía).
-- cargo ortogonal (cargo_id). Departamento se DERIVA del equipo → dropea usuarios.departamento_id.

-- 1. Catálogo de cargos
CREATE TABLE IF NOT EXISTS public.cargos (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Equipos (dentro de un departamento, con un líder)
CREATE TABLE IF NOT EXISTS public.equipos (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  departamento_id uuid NOT NULL REFERENCES public.departamentos(id),
  lider_id uuid REFERENCES public.usuarios(id),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. usuarios: nuevas FK (nullable — persona sin equipo = sin departamento)
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS equipo_id uuid REFERENCES public.equipos(id);
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.cargos(id);

-- 4. RLS: lectura para autenticados (mismo patrón que departamentos); escritura solo service_role (sin policy)
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cargos_select_authenticated" ON public.cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipos_select_authenticated" ON public.equipos FOR SELECT TO authenticated USING (true);

-- 5. Seed de catálogos (idempotente)
INSERT INTO public.departamentos (codigo, nombre, color, icono, activo)
VALUES ('MKT', 'Marketing', '#7C6FF7', '📣', true)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.equipos (codigo, nombre, departamento_id, activo)
SELECT 'MKT-GEN', 'Marketing', d.id, true
FROM public.departamentos d WHERE d.codigo = 'MKT'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.cargos (codigo, nombre) VALUES
  ('DIR_MKT',    'Director de Marketing'),
  ('LEAD_DSG',   'Lead Designer'),
  ('GRAPH_DSG',  'Graphic Designer'),
  ('LEAD_EDIT',  'Lead Editor & Animations'),
  ('VIDEO_EDIT', 'Video Editor'),
  ('FULLSTACK',  'Full Stack Developer'),
  ('EXEC_CM',    'Ejecutiva de Cuentas & CM')
ON CONFLICT (codigo) DO NOTHING;

-- 6. Migración genérica de datos existentes (no-op en dev/local vacío; efectiva en prod)
--    cargo (text) -> cargo_id
UPDATE public.usuarios u SET cargo_id = c.id
FROM public.cargos c
WHERE u.cargo_id IS NULL AND u.cargo IS NOT NULL AND c.nombre = u.cargo;
--    quien estaba en departamento Marketing -> equipo Marketing
UPDATE public.usuarios u SET equipo_id = e.id
FROM public.equipos e
JOIN public.departamentos d ON d.id = e.departamento_id
WHERE u.equipo_id IS NULL AND d.codigo = 'MKT' AND u.departamento_id = d.id;

-- 7. Drop de columnas redundantes (departamento derivado del equipo; cargo migrado a cargo_id)
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS departamento_id;
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS cargo;
```

- [ ] **Step 4: Aplicar la migración a local**

Run: `pnpm supabase db push --local`
Expected: aplica sin error; lista la migración `estructura_equipos_cargos` como aplicada.

- [ ] **Step 5: Verificar esquema y catálogos**

Run:
```bash
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres -c "
SELECT (SELECT count(*) FROM public.cargos) AS cargos,
       (SELECT count(*) FROM public.equipos) AS equipos,
       (SELECT count(*) FROM public.departamentos WHERE codigo='MKT') AS mkt_depto,
       (SELECT count(*) FROM information_schema.columns WHERE table_name='usuarios' AND column_name IN ('equipo_id','cargo_id')) AS nuevas_cols,
       (SELECT count(*) FROM information_schema.columns WHERE table_name='usuarios' AND column_name IN ('departamento_id','cargo')) AS cols_dropeadas;"
```
Expected: `cargos=7`, `equipos=1`, `mkt_depto=1`, `nuevas_cols=2`, `cols_dropeadas=0`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): tablas equipos/cargos + FK usuarios, drop departamento_id/cargo"
```

---

## Task 2: Seed del roster de marketing (dev/local)

**Files:**
- Create: `supabase/seed/equipo_marketing_dev.sql`

**Interfaces:**
- Consumes: tablas/columnas de Task 1.
- Produces: en local, 9 usuarios de marketing activos con `equipo_id`=MKT-GEN + `cargo_id`, `responsable_ref` en los 6 que lo tienen; 1 usuario inactivo `Jonathan` (`responsable_ref='Jonathan_CRM'`, sin equipo) para resolver nombres de tareas históricas; `equipos.MKT-GEN.lider_id` = Freddy.

- [ ] **Step 1: Escribir el seed**

Create `supabase/seed/equipo_marketing_dev.sql`:

```sql
-- SEED dev/local del equipo de marketing. NO es una migración (no versionar en prod).
-- Requiere la migración estructura_equipos_cargos aplicada. Idempotente por email.
-- Prod NO usa este seed: allá el equipo se backfillea sobre usuarios ya existentes.

INSERT INTO public.usuarios (email, nombre, apellido, rol, activo, auth_id, equipo_id, cargo_id, responsable_ref, color)
SELECT v.email, v.nombre, v.apellido, 'stratix360', v.activo, NULL,
       CASE WHEN v.en_equipo THEN e.id ELSE NULL END,
       c.id, v.ref, v.color
FROM (VALUES
  -- nombre, apellido, email, cargo, responsable_ref, activo, en_equipo(MKT), color
  ('Freddy','Crespín','freddy@eminat.net','Director de Marketing','Coord_MFreddy', true,  true,  '#7C6FF7'),
  ('Joselyne','Guerrero','joselyne@eminat.net','Lead Designer','DG_Joselyn',       true,  true,  '#F472B6'),
  ('Arianna','Sig-Tú','arianna@eminat.net','Graphic Designer','DG_Ariana',          true,  true,  '#A78BFA'),
  ('Angie','Núñez','angie@eminat.net','Graphic Designer',NULL,                      true,  true,  '#60A5FA'),
  ('David','Falconi','david@eminat.net','Lead Editor & Animations','DGA_David',      true,  true,  '#34D399'),
  ('Bryan','Núñez','bryan@eminat.net','Video Editor','EV_Bryan',                     true,  true,  '#FB923C'),
  ('Tasha','Palomino','tasha@eminat.net','Video Editor',NULL,                        true,  true,  '#F87171'),
  ('Wagner','Dueñas','wagner@eminat.net','Full Stack Developer',NULL,                true,  true,  '#FBB040'),
  ('Naomi','Panchana','naomi@eminat.net','Ejecutiva de Cuentas & CM','CM_ Naomi',    true,  true,  '#60A5FA'),
  -- Inactivo: solo para resolver responsable_ref histórico en actividades viejas
  ('Jonathan','Bula','jonathan@eminat.net','',' Jonathan_CRM_PLACEHOLDER',           false, false, '#9494B3')
) AS v(nombre, apellido, email, cargo, ref, activo, en_equipo, color)
LEFT JOIN public.cargos c ON c.nombre = v.cargo
CROSS JOIN public.equipos e
WHERE e.codigo = 'MKT-GEN'
ON CONFLICT (email) DO NOTHING;

-- Corrige el ref de Jonathan (el placeholder de arriba evita chocar con la columna;
-- se setea explícito aquí para dejar claro el valor real).
UPDATE public.usuarios SET responsable_ref = 'Jonathan_CRM' WHERE email = 'jonathan@eminat.net';

-- Líder del equipo Marketing = Freddy
UPDATE public.equipos
SET lider_id = (SELECT id FROM public.usuarios WHERE responsable_ref = 'Coord_MFreddy')
WHERE codigo = 'MKT-GEN';
```

> Nota: el `responsable_ref` de Jonathan se asigna en un `UPDATE` aparte para no depender del orden de columnas del `VALUES`. Angie/Tasha/Wagner van sin `responsable_ref` (no tienen tareas propias); Jonathan va `activo=false` y sin equipo, así que NO aparece en Team ni en el dropdown de asignables, pero sí resuelve su nombre en tareas históricas.

- [ ] **Step 2: Aplicar el seed a local**

Run:
```bash
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres < supabase/seed/equipo_marketing_dev.sql
```
Expected: `INSERT 0 10` (o menos si ya existían) + dos `UPDATE 1`.

- [ ] **Step 3: Verificar el seed (Team, asignables, lookup, líder)**

Run:
```bash
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres -c "
SELECT
  (SELECT count(*) FROM usuarios u JOIN equipos e ON e.id=u.equipo_id JOIN departamentos d ON d.id=e.departamento_id
     WHERE d.codigo='MKT' AND u.activo) AS team_marketing,
  (SELECT count(*) FROM usuarios u JOIN equipos e ON e.id=u.equipo_id JOIN departamentos d ON d.id=e.departamento_id
     WHERE d.codigo='MKT' AND u.activo AND u.responsable_ref IS NOT NULL) AS asignables,
  (SELECT count(*) FROM usuarios WHERE responsable_ref IS NOT NULL) AS refs_totales,
  (SELECT nombre FROM usuarios WHERE id=(SELECT lider_id FROM equipos WHERE codigo='MKT-GEN')) AS lider;"
```
Expected: `team_marketing=9`, `asignables=6`, `refs_totales=7`, `lider=Freddy`.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed/equipo_marketing_dev.sql
git commit -m "chore(db): seed dev del equipo de marketing (roster real en usuarios)"
```

---

## Task 3: Derivaciones puras + embed + exposición en contexto

**Files:**
- Create: `shared/context/team-derivations.ts`
- Create: `shared/context/team-derivations.test.ts`
- Modify: `shared/data/usuarios.ts:18-19`
- Modify: `shared/context/AppContext.tsx` (tipo + value)

**Interfaces:**
- Produces:
  - `deriveMiembrosRef(usuarios): Record<string,string>` — `responsable_ref → nombre` de TODOS los usuarios con `responsable_ref` (activos o no).
  - `deriveMiembrosAsignables(usuarios): { ref: string; nombre: string }[]` — activos, departamento MKT, con `responsable_ref`.
  - `deriveEquipoMarketing(usuarios): any[]` — activos, departamento MKT.
  - `useApp()` expone `miembrosRef`, `miembrosAsignables`, `equipoMarketing`.
  - `listActivos()` devuelve cada usuario con `equipos.{codigo,nombre,lider_id,departamentos.codigo}` y `cargos.nombre` embebidos.

- [ ] **Step 1: Escribir el test (falla)**

Create `shared/context/team-derivations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveMiembrosRef, deriveMiembrosAsignables, deriveEquipoMarketing } from './team-derivations'

const mkt = { departamentos: { codigo: 'MKT' } }
const otro = { departamentos: { codigo: 'FIN' } }
const usuarios = [
  { nombre: 'Freddy', responsable_ref: 'Coord_MFreddy', activo: true, equipos: mkt },
  { nombre: 'Angie', responsable_ref: null, activo: true, equipos: mkt },     // sin ref
  { nombre: 'Jonathan', responsable_ref: 'Jonathan_CRM', activo: false, equipos: null }, // inactivo, sin equipo
  { nombre: 'Ana', responsable_ref: 'FIN_Ana', activo: true, equipos: otro }, // otro depto
]

describe('team-derivations', () => {
  it('miembrosRef incluye a los inactivos con ref (para tareas históricas)', () => {
    expect(deriveMiembrosRef(usuarios)).toEqual({
      Coord_MFreddy: 'Freddy', Jonathan_CRM: 'Jonathan', FIN_Ana: 'Ana',
    })
  })
  it('asignables = activos + MKT + con ref', () => {
    expect(deriveMiembrosAsignables(usuarios)).toEqual([{ ref: 'Coord_MFreddy', nombre: 'Freddy' }])
  })
  it('equipoMarketing = activos + MKT (incluye a los sin ref, excluye inactivos y otros deptos)', () => {
    expect(deriveEquipoMarketing(usuarios).map((u) => u.nombre)).toEqual(['Freddy', 'Angie'])
  })
})
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `pnpm vitest run shared/context/team-derivations.test.ts`
Expected: FAIL — "Cannot find module './team-derivations'".

- [ ] **Step 3: Escribir los helpers**

Create `shared/context/team-derivations.ts`:

```ts
// Deriva la data de equipo desde `usuarios` reales (reemplaza los hardcodes
// MIEMBROS_REFS / ACTIVE_MIEMBROS_REFS / STRATIX360_ROSTER).

type U = {
  nombre?: string | null
  responsable_ref?: string | null
  activo?: boolean | null
  equipos?: { departamentos?: { codigo?: string | null } | null } | null
}

const esMarketing = (u: U) => u.equipos?.departamentos?.codigo === 'MKT'

// ref -> nombre, para mostrar el responsable en actividades. Incluye a TODOS los
// que tengan responsable_ref (activos o no) para que tareas viejas de gente
// inactiva (ej. Jonathan_CRM) sigan resolviendo el nombre.
export function deriveMiembrosRef(usuarios: U[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const u of usuarios) if (u.responsable_ref && u.nombre) map[u.responsable_ref] = u.nombre
  return map
}

// Equipo de marketing asignable: activos, departamento Marketing, con ref.
export function deriveMiembrosAsignables(usuarios: U[]): { ref: string; nombre: string }[] {
  return usuarios
    .filter((u) => u.activo && u.responsable_ref && esMarketing(u))
    .map((u) => ({ ref: u.responsable_ref as string, nombre: u.nombre as string }))
}

// Miembros del equipo de marketing para la pestaña Team (lista plana).
export function deriveEquipoMarketing<T extends U>(usuarios: T[]): T[] {
  return usuarios.filter((u) => u.activo && esMarketing(u))
}
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `pnpm vitest run shared/context/team-derivations.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Agregar el embed a `listActivos`**

En `shared/data/usuarios.ts`, reemplazar la línea 18-19:

```ts
// Lista usuarios activos ordenados por nombre, con estructura organizacional embebida.
export const listActivos = () =>
  supabase.from(TABLES.usuarios)
    .select('*, equipos(codigo, nombre, lider_id, departamentos(codigo, nombre)), cargos(codigo, nombre)')
    .eq('activo', true).order('nombre', { ascending: true })
```

- [ ] **Step 6: Exponer las derivaciones en `AppContext`**

En `shared/context/AppContext.tsx`:
1. Importar los helpers (junto a los otros imports de contexto):
   ```ts
   import { deriveMiembrosRef, deriveMiembrosAsignables, deriveEquipoMarketing } from './team-derivations'
   ```
2. En el tipo `AppContextType`, cerca de `usuarios: any[]` (línea 39), agregar:
   ```ts
   miembrosRef: Record<string, string>
   miembrosAsignables: { ref: string; nombre: string }[]
   equipoMarketing: any[]
   ```
3. Después de `const { sessionError, ...app } = useAppData()` (línea 78), derivar:
   ```ts
   const miembrosRef = deriveMiembrosRef(app.usuarios)
   const miembrosAsignables = deriveMiembrosAsignables(app.usuarios)
   const equipoMarketing = deriveEquipoMarketing(app.usuarios)
   ```
4. En el objeto `value={{ ... }}` (línea 90), agregar `miembrosRef, miembrosAsignables, equipoMarketing,`.

- [ ] **Step 7: Typecheck + tests**

Run: `pnpm tsc --noEmit && pnpm test`
Expected: sin errores de tipo; todos los tests verdes (los previos + los 3 nuevos).

- [ ] **Step 8: Commit**

```bash
git add shared/context/team-derivations.ts shared/context/team-derivations.test.ts shared/data/usuarios.ts shared/context/AppContext.tsx
git commit -m "feat(stratix): deriva equipo/refs desde usuarios y expone en contexto"
```

---

## Task 4: Swap de consumidores + eliminar `MIEMBROS_REFS`/`ACTIVE_MIEMBROS_REFS`

**Files:**
- Modify: `features/stratix-mkt/hooks/useStratixData.ts:2,5,59,61,79,92`
- Modify: `features/stratix-mkt/components/gantt/GanttBar.tsx:2,17`
- Modify: `features/stratix-mkt/components/kanban/KanbanTaskCard.tsx:2,9,21,23`
- Modify: `features/stratix-mkt/components/solicitudes/TaskTableRow.tsx:2,17`
- Modify: `features/stratix-mkt/components/modals/ActivityDetailModal.tsx:2,13`
- Modify: `features/stratix-mkt/components/modals/NewActivityModal.tsx:2,4,6,41`
- Modify: `features/stratix-mkt/components/solicitudes/SolicitudesAvailabilityView.tsx:6`
- Modify: `features/stratix-mkt/components/reporte/ReporteTab.tsx:4,7`
- Modify: `shared/constants/domain.ts:48-56`
- Modify: `shared/context/AppContext.tsx:22`
- Modify: `features/stratix-mkt/team.ts`

**Interfaces:**
- Consumes: `useApp().miembrosRef`, `useApp().miembrosAsignables` (Task 3).

Hay dos patrones de reemplazo:

**Patrón LOOKUP** (mostrar nombre del responsable) — `MIEMBROS_REFS[ref]` → `miembrosRef[ref]` (de `useApp()`).
**Patrón ITERACIÓN** (dropdown/tabla de asignables) — `Object.entries(ACTIVE_MIEMBROS_REFS)` → `miembrosAsignables` (de `useApp()`), mapeando `{ref, nombre}`.

- [ ] **Step 1: `useStratixData.ts`**

- Línea 2: quitar `MIEMBROS_REFS` del import de `@/shared/context/AppContext`.
- Línea 5: quitar `ACTIVE_MIEMBROS_REFS` del import de `../team` (dejar `isExcludedFromStratix360` solo si se usa en el cuerpo; si no, quitarlo también).
- Donde se hace `const { ... } = useApp()`, agregar `miembrosRef, miembrosAsignables`.
- Línea 59: `const refsTeam = esAdmin ? miembrosAsignables.map((m) => m.ref) : [usuario?.responsable_ref].filter(Boolean)`
- Líneas 61 y 79: `nombre: miembrosRef[ref] || ref`
- Línea 92: `const nombreRep = miembrosRef[refRep] || usuario?.nombre || refRep`

- [ ] **Step 2: `GanttBar.tsx`**

- Línea 2: quitar `MIEMBROS_REFS` del import; agregar `miembrosRef` al destructuring de `useApp()`.
- Línea 17: `{miembrosRef[a.responsable_ref] || a.responsable_ref}`

- [ ] **Step 3: `KanbanTaskCard.tsx`**

- Línea 2: quitar `MIEMBROS_REFS` del import; agregar `miembrosRef` al destructuring de `useApp()` (línea 6).
- Línea 9: `const nombreMiembro = miembrosRef[a.responsable_ref]`
- Línea 21: `{nombreMiembro?.[0] || '?'}`
- Línea 23: `{nombreMiembro || a.responsable_ref}`

- [ ] **Step 4: `TaskTableRow.tsx`**

- Línea 2: quitar `MIEMBROS_REFS` del import; agregar `miembrosRef` al destructuring de `useApp()`.
- Línea 17: `{miembrosRef[a.responsable_ref] || a.responsable_ref}`

- [ ] **Step 5: `ActivityDetailModal.tsx`**

- Línea 2: quitar `MIEMBROS_REFS` del import; agregar `miembrosRef` al destructuring de `useApp()`.
- Línea 13: `{ label: 'Assignee', value: miembrosRef[modalVerAct.responsable_ref] || modalVerAct.responsable_ref },`

- [ ] **Step 6: `NewActivityModal.tsx`**

- Línea 4: eliminar `import { ACTIVE_MIEMBROS_REFS } from '../../team'`.
- Línea 6: eliminar `const MIEMBROS_ENTRIES = Object.entries(ACTIVE_MIEMBROS_REFS)`.
- Línea 9: agregar `miembrosAsignables` al destructuring de `useApp()`.
- Línea 41: reemplazar el `.map` del dropdown:
  ```tsx
  {miembrosAsignables.map((m) => <option key={m.ref} value={m.ref}>{m.nombre}</option>)}
  ```

- [ ] **Step 7: `SolicitudesAvailabilityView.tsx` y `ReporteTab.tsx`**

Mismo patrón ITERACIÓN que el paso 6, en cada archivo:
- Quitar `import { ACTIVE_MIEMBROS_REFS } from '../../team'`.
- Quitar `const MIEMBROS_ENTRIES = Object.entries(ACTIVE_MIEMBROS_REFS)` (nivel módulo).
- Agregar `miembrosAsignables` al destructuring de `useApp()` dentro del componente.
- Sustituir cada uso de `MIEMBROS_ENTRIES.map(([ref, nombre]) => ...)` por `miembrosAsignables.map((m) => ...)` usando `m.ref`/`m.nombre` (misma forma que antes daba `[ref, nombre]`).

- [ ] **Step 8: Eliminar `MIEMBROS_REFS` de `domain.ts` y el re-export de `AppContext`**

- `shared/constants/domain.ts`: borrar el bloque `export const MIEMBROS_REFS = { ... }` (líneas 48-56).
- `shared/context/AppContext.tsx:22`: quitar `MIEMBROS_REFS,` de la lista de re-exports desde `domain`.

- [ ] **Step 9: Reducir/eliminar `team.ts`**

- Borrar `export const ACTIVE_MIEMBROS_REFS` y su import de `MIEMBROS_REFS` (líneas 1, 32-38) y los sets `STRATIX360_EXCLUDED_*` que solo servían para eso.
- `isExcludedFromStratix360` y `normTeamName` los sigue usando `Stratix360Roster.tsx` hasta la Task 5. Dejar el archivo con solo esas dos funciones por ahora (la Task 5 decide si se borra entero).

- [ ] **Step 10: Typecheck + tests**

Run: `pnpm tsc --noEmit && pnpm test`
Expected: sin errores (ningún archivo importa ya `MIEMBROS_REFS`/`ACTIVE_MIEMBROS_REFS`); todos los tests verdes.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor(stratix): consumidores leen refs/asignables del contexto, elimina hardcodes"
```

---

## Task 5: Pestaña Team = lista plana desde `usuarios`

**Files:**
- Modify: `features/stratix-mkt/components/roster/Stratix360Roster.tsx`
- Modify: `features/stratix-mkt/components/roster/RosterCard.tsx`
- Delete: `features/stratix-mkt/components/roster/roster-data.ts`
- Modify (posible delete): `features/stratix-mkt/team.ts`

**Interfaces:**
- Consumes: `useApp().equipoMarketing` (Task 3); cada usuario trae `cargos?.nombre`, `equipos?.lider_id`, `color`, `online_at`, `email`, `responsable_ref`, `activo`, `id`.

- [ ] **Step 1: Reescribir `RosterCard.tsx` para recibir un `usuario` plano**

Reemplazar el componente entero por una versión que toma `user` (fila de `usuarios`) y `esLider`:

```tsx
'use client'
import { useApp } from '@/shared/context/AppContext'

export default function RosterCard({ user, esLider }: { user: any; esLider: boolean }) {
  const { s1, border, accent, t1, t2, t3, actividades } = useApp()
  const nombreCompleto = `${user.nombre || ''} ${user.apellido || ''}`.trim()
  const initials = nombreCompleto.split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
  const tieneCuenta = !!user.auth_id
  const isOnline = user.online_at ? new Date(user.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
  const tareasHoy = user.responsable_ref
    ? actividades.filter((a) => a.responsable_ref === user.responsable_ref && a.estado === 'En proceso').length
    : 0
  const swatch = user.color || accent
  const cargo = user.cargos?.nombre || user.cargo || ''
  return (
    <div style={{ background: s1, border: `1px solid ${esLider ? `${accent}55` : border}`, borderRadius: 14, padding: 16, boxShadow: esLider ? `0 2px 8px ${accent}20` : '0 1px 3px rgba(0,0,0,0.06)', position: 'relative', opacity: tieneCuenta ? 1 : 0.92 }}>
      {esLider && (
        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 700, letterSpacing: '.1em', padding: '2px 8px', borderRadius: 10, background: accent, color: 'white' }}>LÍDER</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: swatch, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>{initials}</div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: tieneCuenta ? (isOnline ? '#34D399' : '#555') : '#9CA3AF', border: `2px solid ${s1}` }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{nombreCompleto}</div>
          <div style={{ fontSize: 11, color: t2, marginTop: 1 }}>{cargo}</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: t3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tieneCuenta ? `✉ ${user.email}` : '✉ — sin cuenta todavía'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {tieneCuenta ? (
          <span style={{ fontSize: 10, color: isOnline ? '#34D399' : t3 }}>{isOnline ? '● Active now' : 'Offline'}</span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#FBB040', background: '#FBB04015', padding: '2px 8px', borderRadius: 10 }}>Cuenta por crear</span>
        )}
        {tareasHoy > 0 && (
          <span style={{ fontSize: 10, color: '#FBB040', background: '#FBB04015', padding: '2px 8px', borderRadius: 10 }}>{tareasHoy} in progress</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reescribir `Stratix360Roster.tsx` como lista plana**

Reemplazar el archivo entero:

```tsx
'use client'
import { useApp } from '@/shared/context/AppContext'
import RosterCard from './RosterCard'

export default function Stratix360Roster() {
  const { accent, equipoMarketing, usuarios } = useApp()
  const liderId = usuarios.find((u) => u.equipos?.lider_id)?.equipos?.lider_id ?? null

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: accent, marginBottom: 12, padding: '4px 12px', background: `${accent}15`, borderRadius: 20, display: 'inline-block' }}>
        Equipo de Marketing
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {equipoMarketing.map((u) => (
          <RosterCard key={u.id} user={u} esLider={u.id === liderId} />
        ))}
      </div>
    </div>
  )
}
```

> `liderId`: `equipos.lider_id` viene embebido en cada usuario del equipo (`u.equipos.lider_id`). Se toma el primero disponible (todos los del mismo equipo comparten el mismo `lider_id`).

- [ ] **Step 3: Eliminar `roster-data.ts`**

Run: `git rm features/stratix-mkt/components/roster/roster-data.ts`

- [ ] **Step 4: Limpiar `team.ts` si quedó sin uso**

Run: `grep -rn "from '.*team'" features/ shared/ app/ --include=*.ts --include=*.tsx | grep -v node_modules`
- Si no hay ningún import restante de `../team`/`./team`: `git rm features/stratix-mkt/team.ts`.
- Si algún archivo aún importa `normTeamName`/`isExcludedFromStratix360`, dejar el archivo con solo esas funciones.

- [ ] **Step 5: Typecheck + tests**

Run: `pnpm tsc --noEmit && pnpm test`
Expected: sin errores (no queda referencia a `roster-data`/`RosterEntry`/`STRATIX360_ROSTER`); tests verdes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(stratix): pestaña Team como lista plana desde usuarios (departamento Marketing)"
```

---

## Task 6: Verificación integral en el navegador (local)

**Files:** ninguno (verificación).

- [ ] **Step 1: Levantar el dev server contra local**

Confirmar que `.env.local` tiene `NEXT_PUBLIC_APP_ENV=local` (apunta al Docker). Run: `pnpm dev`.

- [ ] **Step 2: Smoke de la pestaña Team**

En `/stratix-mkt` → sub-tab *Team*: aparecen los **9** miembros de marketing en lista plana; Freddy con badge **LÍDER**; Angie/Tasha/Wagner con "sin cuenta todavía" (auth_id NULL); NO aparece Jonathan ni Javier. Sin secciones por disciplina.

- [ ] **Step 3: Smoke de asignación y lookups**

- *New task* → dropdown **Assignee**: lista los **6** asignables (con `responsable_ref`), sin Jonathan. Crear una tarea de prueba y verificar que persiste.
- Kanban / Gantt / tabla de solicitudes / detalle: el responsable se muestra por **nombre** (no por `responsable_ref` crudo). Una tarea histórica con `responsable_ref='Jonathan_CRM'` (si existe en el seed de actividades) muestra "Jonathan".
- Reporte y Disponibilidad: iteran sobre los asignables sin romperse.

- [ ] **Step 4: Limpiar la tarea de prueba**

Borrar la actividad creada en el Step 3 (por la UI o `DELETE` puntual en psql), dejando el conteo de actividades como estaba.

- [ ] **Step 5: Actualizar el ledger SDD**

Marcar en `.superpowers/sdd/2026-08-04-empresa-eje-unico-migracion/progress.md` (o un ledger nuevo de esta fase) que la Fase A quedó implementada y verificada en local; push a remoto y PR siguen diferidos al cierre de la cadena.

---

## Notas de alcance / decisiones diferidas

- **Prod/dev remoto:** este plan NO los toca. El backfill de prod (usuarios ya existentes → `equipo_id`/`cargo_id`, alta de los 2-3 que falten) y el push se hacen al cerrar la cadena de specs, con un audit de `usuarios` de prod (spec §11).
- **§11 abiertas** (Wagner en Team, alta de Angie/Tasha, valores exactos por persona): en el seed de dev se incluyen a todos con valores del roster; el ajuste fino es dato de prod, no bloquea local.
- **Fase A.2** (CRUD de departamentos/equipos/cargos en `/admin`) es spec aparte; aquí los datos entran por seed.

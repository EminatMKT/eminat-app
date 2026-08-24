# Fase 2 — eliminar `responsable_ref` · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `actividades` identifique a las personas por las FK uuid `responsable_id` /
`solicitante_id` en vez de por los textos compuestos `responsable_ref` / `solicitado_por`,
que se eliminan junto con la constante `SOLICITANTES`.

**Architecture:** Dos migraciones en la misma rama — la primera solo backfillea las FK (la
app sigue funcionando con las dos fuentes), la segunda impone `NOT NULL`, dropea las tres
columnas y recrea el RPC. Entre medio, el código migra de a un módulo por commit. La lógica
del reporte por miembro sale de `useStratixData` a un helper puro testeable.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase CLI (migraciones), Vitest.

## Global Constraints

- `any` está prohibido por ESLint (`no-explicit-any: error`). Usar `Pick`/`Omit`/`Partial`
  sobre los tipos existentes.
- i18n: los textos nuevos usan `useT()`/`t()` con claves en `es.json` **y** `en.json`. Nada
  de `i18n-ignore`.
- Animaciones: componentes de `shared/motion`, nunca Framer Motion directo.
- Supabase en cliente: el singleton de `shared/db/supabase.ts`.
- `route.ts` **solo** exporta handlers HTTP; los helpers van en otro archivo.
- Gates que deben pasar antes de cada commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- Conexión a la DB local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

## Desviación respecto del spec (leer antes de empezar)

El spec aprobado dice **una sola migración**. Este plan usa **dos archivos de migración**,
ambos en esta rama y en este PR. Motivo: con una sola, el `DROP COLUMN` cae antes de que el
código sepa leer las FK, y la app queda rota durante seis commits sin forma de verificar
nada. Partiéndola, cada commit intermedio corre y se puede probar en el navegador.

El resultado final en dev y prod es idéntico — se aplican las dos seguidas. No hay período
de dual-write permanente.

`SET NOT NULL` va en la **segunda** migración a propósito: entre las dos, `crearActividad`
todavía manda solo el texto, y un `NOT NULL` temprano rompería la creación de tareas.

## Estructura de archivos

**Se crean:**

| Archivo | Responsabilidad |
|---|---|
| `features/stratix-mkt/report-filter.ts` | Única lógica no trivial: decidir si una actividad pertenece a un miembro. Puro, sin React ni Supabase. |
| `features/stratix-mkt/report-filter.test.ts` | Sus tests. |
| `supabase/migrations/<ts>_backfill_actividades_fk.sql` | Backfill idempotente de las dos FK. |
| `supabase/migrations/<ts>_drop_responsable_ref.sql` | `NOT NULL`, `DROP COLUMN` ×3, RPC nuevo. |

**Se modifican:** 33 archivos, agrupados por tarea en las secciones de abajo. El spec estimó
18; el barrido previo al plan encontró siete consumidores más en Stratix (`TeamRankRow`,
`OverviewTab`, `HoursSummaryCard`, `HorasTab`, `TeamReportCard`, `EquipoTab`, `ReporteTab`)
y `SolicitudesAvailabilityView`, todos alcanzados por el cambio de forma de `ResumenHoras` y
`miembrosAsignables`.

---

### Task 1: Helper puro del reporte por miembro

Es lo único con lógica propia y no depende de nada más: va primero para que el resto de las
tareas puedan consumirlo.

**Files:**
- Create: `features/stratix-mkt/report-filter.ts`
- Test: `features/stratix-mkt/report-filter.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `esActividadDeMiembro(act: ActividadRef, idMiembro: string, mes?: string): boolean`
  y el tipo `ActividadRef = { responsable_id?: string | null; solicitante_id?: string | null; mes?: string | null }`.
  Task 6 lo usa desde `useStratixData`.

- [ ] **Step 1: Escribir el test que falla**

Crear `features/stratix-mkt/report-filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { esActividadDeMiembro } from './report-filter'

const acts = {
  suya:      { responsable_id: 'u1', solicitante_id: 'u9', mes: 'Enero' },
  pedida:    { responsable_id: 'u9', solicitante_id: 'u1', mes: 'Enero' },
  ajena:     { responsable_id: 'u9', solicitante_id: 'u8', mes: 'Enero' },
  otroMes:   { responsable_id: 'u1', solicitante_id: null, mes: 'Marzo' },
  sinMes:    { responsable_id: 'u1', solicitante_id: null, mes: null },
}

describe('esActividadDeMiembro', () => {
  it('cuenta las que el miembro ejecuta', () => {
    expect(esActividadDeMiembro(acts.suya, 'u1')).toBe(true)
  })
  it('cuenta las que el miembro solicitó', () => {
    expect(esActividadDeMiembro(acts.pedida, 'u1')).toBe(true)
  })
  it('no cuenta las que no son suyas por ningún lado', () => {
    expect(esActividadDeMiembro(acts.ajena, 'u1')).toBe(false)
  })
  it('sin mes no filtra por mes', () => {
    expect(esActividadDeMiembro(acts.otroMes, 'u1')).toBe(true)
    expect(esActividadDeMiembro(acts.sinMes, 'u1')).toBe(true)
  })
  it('con mes exige que coincida, aunque la actividad sea suya', () => {
    expect(esActividadDeMiembro(acts.suya, 'u1', 'Enero')).toBe(true)
    expect(esActividadDeMiembro(acts.otroMes, 'u1', 'Enero')).toBe(false)
  })
  it('con mes también aplica a las solicitadas', () => {
    expect(esActividadDeMiembro(acts.pedida, 'u1', 'Enero')).toBe(true)
    expect(esActividadDeMiembro(acts.pedida, 'u1', 'Marzo')).toBe(false)
  })
  it('un id vacío no matchea nada, ni siquiera FK nulas', () => {
    expect(esActividadDeMiembro({ responsable_id: null, solicitante_id: null }, '')).toBe(false)
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm vitest run features/stratix-mkt/report-filter.test.ts`
Expected: FAIL — `Failed to resolve import "./report-filter"`.

- [ ] **Step 3: Implementación mínima**

Crear `features/stratix-mkt/report-filter.ts`:

```ts
// Decide si una actividad entra en el reporte de un miembro.
//
// La regla es "lo que ejecuto más lo que pedí". Antes había una excepción escrita
// con el ref literal de Freddy (`refRep === 'Coord_MFreddy'`), porque era el único
// que solicitaba: eso era un dato, no una regla. Con la FK deja de necesitar código.
export type ActividadRef = {
  responsable_id?: string | null
  solicitante_id?: string | null
  mes?: string | null
}

export function esActividadDeMiembro(act: ActividadRef, idMiembro: string, mes?: string): boolean {
  if (!idMiembro) return false
  const suya = act.responsable_id === idMiembro || act.solicitante_id === idMiembro
  if (!suya) return false
  return mes ? act.mes === mes : true
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `pnpm vitest run features/stratix-mkt/report-filter.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add features/stratix-mkt/report-filter.ts features/stratix-mkt/report-filter.test.ts
git commit -m "feat(stratix): helper puro para el reporte por miembro

Saca de useStratixData los tres ternarios que deciden qué actividades
entran en el reporte, y de paso generaliza la excepción hardcodeada de
Coord_MFreddy: la regla pasa a ser 'lo que ejecuto más lo que pedí',
igual para todos."
```

---

### Task 2: Migración de backfill

No toca código. Al terminar, las FK están llenas y las columnas texto siguen ahí: la app
funciona exactamente igual que antes.

**Files:**
- Create: `supabase/migrations/<timestamp>_backfill_actividades_fk.sql`

**Interfaces:**
- Consumes: nada.
- Produces: `actividades.responsable_id` y `actividades.solicitante_id` pobladas. Todas las
  tareas siguientes asumen que leer esas columnas devuelve datos.

- [ ] **Step 1: Respaldar las actividades locales**

El backfill es la única oportunidad de verificar el mapeo con datos reales, y la Task 8 las
dropea sin retorno. `supabase/rollback/` está gitignoreado.

```bash
mkdir -p supabase/rollback
pg_dump "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  --data-only --table=public.actividades \
  > supabase/rollback/predump-actividades-fase2.sql
wc -l supabase/rollback/predump-actividades-fase2.sql
```

Expected: el archivo existe y tiene contenido (las 18 filas).

- [ ] **Step 2: Verificar que no hay refs huérfanos**

Es la consulta que el spec exige antes de cada `db push`. Si devuelve filas, **parar** y
resolver el mapeo antes de seguir.

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
SELECT DISTINCT a.responsable_ref FROM actividades a
 LEFT JOIN usuarios u ON u.responsable_ref = a.responsable_ref
 WHERE u.id IS NULL;"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
SELECT DISTINCT a.solicitado_por FROM actividades a
 LEFT JOIN usuarios u ON u.responsable_ref = a.solicitado_por
 WHERE a.solicitado_por IS NOT NULL AND u.id IS NULL;"
```

Expected: las dos devuelven `(0 rows)`.

- [ ] **Step 3: Crear la migración**

```bash
pnpm supabase migration new backfill_actividades_fk
```

Escribir en el archivo generado:

```sql
-- Backfill de las FK uuid de `actividades` desde los refs de texto.
--
-- Las columnas responsable_id/solicitante_id existen desde el dump original y
-- están vacías: el RPC admin_reassign_and_delete ya filtra por responsable_id,
-- así que hoy transfiere 0 filas al heredar tareas. Esto las llena.
--
-- `solicitado_por` también guarda un responsable_ref (su único valor es
-- 'Coord_MFreddy'), por eso los dos joins van contra usuarios.responsable_ref.
--
-- Idempotente: se puede correr dos veces sin efecto. El DROP de las columnas
-- texto va en la migración siguiente, cuando el código ya no las lea.

UPDATE public.actividades a
   SET responsable_id = u.id
  FROM public.usuarios u
 WHERE u.responsable_ref = a.responsable_ref
   AND a.responsable_id IS DISTINCT FROM u.id;

UPDATE public.actividades a
   SET solicitante_id = u.id
  FROM public.usuarios u
 WHERE u.responsable_ref = a.solicitado_por
   AND a.solicitante_id IS DISTINCT FROM u.id;
```

- [ ] **Step 4: Aplicar en local**

**No usar `db reset`**: `supabase/config.toml` apunta `sql_paths` a un `seed.sql` que no
existe, así que un reset borraría las 18 actividades y dejaría el backfill sin nada que
probar. `migration up` aplica solo lo pendiente y conserva los datos.

```bash
pnpm supabase migration up
```

Expected: aplica la migración nueva sin error.

- [ ] **Step 5: Verificar el backfill**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
SELECT count(*) total,
       count(responsable_id) con_resp,
       count(solicitante_id) con_sol,
       count(*) FILTER (WHERE responsable_id IS NULL) sin_resp
  FROM actividades;"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
SELECT u.nombre, u.apellido, count(*)
  FROM actividades a JOIN usuarios u ON u.id = a.responsable_id
 GROUP BY 1,2 ORDER BY 3 DESC;"
```

Expected: `total 18 · con_resp 18 · con_sol 18 · sin_resp 0`, y el reparto por persona
coincide con Bryan 4, Joselyne 4, Naomi 3, Arianna 3, David 3, Freddy 1.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): backfill de responsable_id y solicitante_id en actividades

Las FK existían vacías desde el dump original. Al llenarlas, el RPC de
reasignación pasa a transferir de verdad — hoy filtra por responsable_id
y encuentra 0 filas. Las columnas texto siguen en pie hasta que el
código deje de leerlas."
```

---

### Task 3: Derivaciones por id

**Files:**
- Modify: `shared/context/team-derivations.ts`
- Modify: `shared/context/team-derivations.test.ts`
- Modify: `shared/context/AppContext.tsx:37` (tipo), `:93` (llamada), `:111` (value)

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces:
  - `deriveMiembrosPorId(usuarios: U[]): Record<string, string>` — id → `"Nombre Apellido"`.
  - `deriveMiembrosAsignables(usuarios: U[]): { id: string; nombre: string }[]`.
  - `deriveEquipoMarketing<T extends U>(usuarios: T[]): T[]` — sin cambios.
  - En `useApp()`: `miembrosPorId: Record<string, string>` (reemplaza a `miembrosRef`) y
    `miembrosAsignables` con la forma `{ id, nombre }`. Las tareas 5 y 6 los consumen.

**Nota:** al terminar esta tarea `pnpm typecheck` **falla** en los consumidores de
`miembrosRef` — se arreglan en las tareas 5 y 6. Es esperado; el gate de typecheck para
esta tarea es el que se indica en el Step 5.

- [ ] **Step 1: Reescribir el test**

Reemplazar el contenido de `shared/context/team-derivations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveMiembrosPorId, deriveMiembrosAsignables, deriveEquipoMarketing } from './team-derivations'

const mkt = { departamentos: { codigo: 'MKT' } }
const otro = { departamentos: { codigo: 'FIN' } }
const usuarios = [
  { id: 'u1', nombre: 'Freddy', apellido: 'Crespín', activo: true, equipos: mkt },
  { id: 'u2', nombre: 'Angie', apellido: 'Núñez', activo: true, equipos: mkt },
  { id: 'u3', nombre: 'Jonathan', apellido: 'Bula', activo: false, equipos: null }, // inactivo, sin equipo
  { id: 'u4', nombre: 'Ana', apellido: 'Pérez', activo: true, equipos: otro },      // otro depto
  { id: 'u5', nombre: 'Sinapellido', apellido: null, activo: true, equipos: mkt },
]

describe('team-derivations', () => {
  it('miembrosPorId incluye a los inactivos (para tareas históricas)', () => {
    expect(deriveMiembrosPorId(usuarios)).toEqual({
      u1: 'Freddy Crespín', u2: 'Angie Núñez', u3: 'Jonathan Bula',
      u4: 'Ana Pérez', u5: 'Sinapellido',
    })
  })
  it('miembrosPorId ignora las filas sin id o sin nombre', () => {
    expect(deriveMiembrosPorId([
      { id: 'x', nombre: null, activo: true },
      { id: null, nombre: 'Fantasma', activo: true },
    ])).toEqual({})
  })
  it('asignables = activos + MKT, ya sin exigir ref', () => {
    expect(deriveMiembrosAsignables(usuarios)).toEqual([
      { id: 'u1', nombre: 'Freddy Crespín' },
      { id: 'u2', nombre: 'Angie Núñez' },
      { id: 'u5', nombre: 'Sinapellido' },
    ])
  })
  it('equipoMarketing = activos + MKT (excluye inactivos y otros deptos)', () => {
    expect(deriveEquipoMarketing(usuarios).map((u) => u.nombre)).toEqual(['Freddy', 'Angie', 'Sinapellido'])
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm vitest run shared/context/team-derivations.test.ts`
Expected: FAIL — `deriveMiembrosPorId is not a function`.

- [ ] **Step 3: Reescribir las derivaciones**

Reemplazar el contenido de `shared/context/team-derivations.ts`:

```ts
// Deriva la data de equipo desde `usuarios` reales.

type U = {
  id?: string | null
  nombre?: string | null
  apellido?: string | null
  activo?: boolean | null
  equipos?: { departamentos?: { codigo?: string | null } | null } | null
}

const esMarketing = (u: U) => u.equipos?.departamentos?.codigo === 'MKT'

const nombreCompleto = (u: U) => `${u.nombre || ''} ${u.apellido || ''}`.trim()

// id -> "Nombre Apellido", para mostrar responsable y solicitante en actividades.
// Incluye a TODOS (activos o no) para que las tareas viejas de gente inactiva
// sigan resolviendo el nombre.
export function deriveMiembrosPorId(usuarios: U[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const u of usuarios) if (u.id && u.nombre) map[u.id] = nombreCompleto(u)
  return map
}

// Equipo de marketing asignable: activos del departamento Marketing. Antes exigía
// además `responsable_ref`, y ese filtro dejaba fuera a las tres personas que nunca
// tuvieron ref — no eran asignables por un artefacto del esquema, no por una regla.
export function deriveMiembrosAsignables(usuarios: U[]): { id: string; nombre: string }[] {
  return usuarios
    .filter((u) => u.activo && u.id && esMarketing(u))
    .map((u) => ({ id: u.id as string, nombre: nombreCompleto(u) }))
}

// Miembros del equipo de marketing para la pestaña Team (lista plana).
export function deriveEquipoMarketing<T extends U>(usuarios: T[]): T[] {
  return usuarios.filter((u) => u.activo && esMarketing(u))
}
```

- [ ] **Step 4: Actualizar AppContext**

En `shared/context/AppContext.tsx`:

1. En el import de `./team-derivations`, cambiar `deriveMiembrosRef` por `deriveMiembrosPorId`.
2. En `interface AppContextType` (línea ~37), reemplazar las dos líneas:

```ts
  miembrosPorId: Record<string, string>
  miembrosAsignables: { id: string; nombre: string }[]
```

3. En el cuerpo de `AppProvider` (línea ~93):

```ts
  const miembrosPorId = deriveMiembrosPorId(app.adminUsuarios)
```

4. En el objeto `value` (línea ~111), cambiar `miembrosRef,` por `miembrosPorId,`.

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `pnpm vitest run shared/context/team-derivations.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add shared/context/team-derivations.ts shared/context/team-derivations.test.ts shared/context/AppContext.tsx
git commit -m "refactor(context): las derivaciones de equipo van por id, no por ref

miembrosRef pasa a miembrosPorId (id -> 'Nombre Apellido') y los
asignables dejan de exigir responsable_ref: ese filtro dejaba fuera a
Angie, Tasha y Wagner por no tener un ref que nunca fue obligatorio."
```

---

### Task 4: Tipos y capa de datos

**Files:**
- Modify: `shared/constants/domain.ts:42-52` (borrar `SOLICITANTES`)
- Modify: `shared/context/AppContext.tsx:25` (quitar `SOLICITANTES` de la re-exportación)
- Modify: `shared/context/loadAppData.ts:34`, `:67`, `:74`, `:255`
- Modify: `shared/data/actividades.ts:6-11`
- Modify: `shared/db/session/index.ts:35`
- Modify: `features/stratix-mkt/types.ts:15`, `:21`, `:8`

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces:
  - `Actividad` con `responsable_id?: string` y `solicitante_id?: string` (sin los text).
  - `Usuario` y `ProfileUser` sin `responsable_ref`.
  - `actividadesRepo.list(responsableId?: string)` filtra por `responsable_id`.
  - `NuevaActForm` con `responsable_id: string` y `solicitante_id: string`.
  - `ResumenHoras` con `id: string` en vez de `ref: string`.
  - `SOLICITANTES` deja de existir. Tareas 5 y 6 dependen de todo esto.

- [ ] **Step 1: Borrar `SOLICITANTES`**

En `shared/constants/domain.ts`, eliminar el bloque completo:

```ts
export const SOLICITANTES = [
  { value: 'Coord_MFreddy', label: 'Freddy Crespin — Marketing Director' },
  ...
]
```

En `shared/context/AppContext.tsx` línea ~25, sacar `SOLICITANTES,` de la lista re-exportada
desde `@/shared/constants/domain`.

- [ ] **Step 2: Actualizar los tipos**

En `shared/context/loadAppData.ts`:

- Línea ~34, en `Usuario`: borrar `responsable_ref?: string | null`.
- Líneas ~67 y ~74, en `Actividad`: reemplazar `responsable_ref?: string` por
  `responsable_id?: string` y `solicitado_por?: string` por `solicitante_id?: string`.

En `shared/db/session/index.ts` línea ~35, en `ProfileUser`: borrar
`responsable_ref?: string | null`.

En `features/stratix-mkt/types.ts`:

```ts
export type ResumenHoras = { id: string; nombre: string; total: number; completadas: number; horas: number; dias: number }

export type NuevaActForm = {
  titulo: string
  descripcion: string
  empresa: string
  responsable_id: string
  mes: string
  horas: string
  dias_produccion: string
  estado: string
  fecha_entrega: string
  solicitante_id: string
  drive_url: string
}
```

- [ ] **Step 3: Actualizar la capa de datos**

En `shared/data/actividades.ts`:

```ts
// Lista actividades por created_at desc. Si se pasa responsableId, filtra por él.
export const list = (responsableId?: string) => {
  let q = supabase.from(TABLES.actividades).select('*').order(COLUMNS.createdAt, { ascending: false })
  if (responsableId) q = q.eq('responsable_id', responsableId)
  return q
}
```

En `shared/context/loadAppData.ts` línea ~255, dentro del `Promise.all`:

```ts
        // Un no-admin ve solo lo suyo. Antes el filtro era el ref y quien no tenía
        // caía en `undefined` — o sea, sin filtro: veía todas las actividades.
        actividadesRepo.list(!isAdmin ? usr.id : undefined),
```

- [ ] **Step 4: Verificar que el typecheck señala exactamente los consumidores pendientes**

Run: `pnpm typecheck`
Expected: FAIL, y **solo** en archivos de las tareas 5, 6 y 7 (componentes de
`features/stratix-mkt/components/`, `useStratixData.ts`, `features/admin/`). Si aparece un
archivo fuera de esa lista, es un consumidor que este plan no contempló: anotarlo antes de
seguir.

- [ ] **Step 5: Commit**

```bash
git add shared/constants/domain.ts shared/context/AppContext.tsx shared/context/loadAppData.ts shared/data/actividades.ts shared/db/session/index.ts features/stratix-mkt/types.ts
git commit -m "refactor(types): actividades tipadas por FK uuid, se borra SOLICITANTES

SOLICITANTES mezclaba 4 personas y 5 empresas; las empresas ya las cubre
actividades.empresa desde la fase 1 y las personas viven en usuarios.

De paso, el filtro de no-admin pasa a usar el id: con el ref, quien no
tenía caía en 'sin filtro' y veía todas las actividades."
```

---

### Task 5: Vistas de Stratix

Trece componentes de presentación, ninguno con lógica. Doce cambian `miembrosRef[...ref]`
por `miembrosPorId[...id]` o la key de un `.map()`; dos además **borran** una línea que hoy
imprime el ref en pantalla.

**Files:**
- Modify: `features/stratix-mkt/components/kanban/KanbanTaskCard.tsx:8`, `:11`, `:25`
- Modify: `features/stratix-mkt/components/gantt/GanttBar.tsx:8`, `:20`
- Modify: `features/stratix-mkt/components/solicitudes/TaskTableRow.tsx:8`, `:20`
- Modify: `features/stratix-mkt/components/solicitudes/MemberAvailabilityCard.tsx:7`, `:9`, `:15`
- Modify: `features/stratix-mkt/components/solicitudes/SolicitudesAvailabilityView.tsx:15`
- Modify: `features/stratix-mkt/components/overview/RecentActivityRow.tsx:12`
- Modify: `features/stratix-mkt/components/roster/RosterCard.tsx:9`, `:21-23`
- Modify: `features/stratix-mkt/components/overview/TeamRankRow.tsx:4`
- Modify: `features/stratix-mkt/components/overview/OverviewTab.tsx:82`
- Modify: `features/stratix-mkt/components/horas/HoursSummaryCard.tsx:17`
- Modify: `features/stratix-mkt/components/horas/HorasTab.tsx:20`
- Modify: `features/stratix-mkt/components/equipo/TeamReportCard.tsx:17`
- Modify: `features/stratix-mkt/components/equipo/EquipoTab.tsx:25`
- Modify: `features/stratix-mkt/components/reporte/ReporteTab.tsx:34`

**Interfaces:**
- Consumes: `miembrosPorId` y `miembrosAsignables: { id, nombre }[]` (Task 3);
  `Actividad.responsable_id` y `ResumenHoras.id` (Task 4).
- Produces: `MemberAvailabilityCard` cambia su prop `refKey: string` por `userId: string`.

**Regla del fallback:** donde antes se hacía `miembrosRef[ref] || ref`, ahora **no** se cae
al id — imprimiría un uuid crudo en pantalla. Usar `?? '—'`. Por el mismo motivo, donde el
ref se renderizaba **como contenido** la línea se borra: no hay uuid que valga la pena
mostrarle a nadie, y el nombre completo ya dice quién es.

- [ ] **Step 1: KanbanTaskCard**

Línea 8: `miembrosRef` → `miembrosPorId` en el destructuring de `useApp()`.
Línea 11: `const nombreMiembro = miembrosPorId[a.responsable_id]`
Línea 25: `{nombreMiembro ?? '—'}`

- [ ] **Step 2: GanttBar**

Línea 8: `miembrosRef` → `miembrosPorId`.
Línea 20: `{miembrosPorId[a.responsable_id] ?? '—'}`

- [ ] **Step 3: TaskTableRow**

Línea 8: `miembrosRef` → `miembrosPorId`.
Línea 20: `{miembrosPorId[a.responsable_id] ?? '—'}`

- [ ] **Step 4: MemberAvailabilityCard**

Renombrar la prop y usar el id en los dos lugares:

```tsx
export default function MemberAvailabilityCard({ userId, nombre }: { userId: string; nombre: string }) {
  const { s1, border, accent, t1, t2, t3, usuarios, actividades, colorMarca } = useApp()
  const tareasActivas = actividades.filter(a => a.responsable_id === userId && (a.estado === 'En proceso' || a.estado === 'Pendiente'))
```

y más abajo:

```tsx
  const userInfo = usuarios.find((u) => u.id === userId)
```

El resto del componente no cambia.

- [ ] **Step 5: SolicitudesAvailabilityView**

Línea 15:

```tsx
          <MemberAvailabilityCard key={m.id} userId={m.id} nombre={m.nombre} />
```

- [ ] **Step 6: RecentActivityRow**

Línea 12 — el componente mostraba el ref crudo; ahora necesita el mapa. Agregar
`miembrosPorId` al destructuring de `useApp()` que ya existe en el archivo y cambiar la
línea a:

```tsx
        <div style={{ fontSize: 9, color: t3 }}>{a.empresa} · {miembrosPorId[a.responsable_id] ?? '—'} · {a.mes}</div>
```

- [ ] **Step 7: RosterCard**

Línea 9 — el `Pick` cambia:

```tsx
type RosterUser = Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'email' | 'online_at' | 'color'> & {
```

Líneas 21-23 — el conteo ya no necesita el guard del ref, porque todos los usuarios tienen id:

```tsx
  const tareasHoy = actividades.filter((a) => a.responsable_id === user.id && a.estado === 'En proceso').length
```

- [ ] **Step 8: Las dos tarjetas que imprimen el ref**

`HoursSummaryCard.tsx:17` y `TeamReportCard.tsx:17` renderizan `{r.ref}` como subtítulo bajo
el nombre — era legible cuando decía `DG_Joselyn`. Con un uuid no lo es, y el nombre
completo ya identifica a la persona: **borrar la línea entera** en ambos archivos.

En `HoursSummaryCard.tsx`:

```tsx
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t1 }}>{r.nombre}</div>
        </div>
```

En `TeamReportCard.tsx`, exactamente lo mismo (el `<div>` del subtítulo ahí no lleva
`fontFamily: 'DM Mono'`, pero se borra igual).

- [ ] **Step 9: Keys de listas y el tipo local de TeamRankRow**

Cambios de una palabra, todos de `ref` a `id`:

- `TeamRankRow.tsx:4` — el tipo local: `type Miembro = { id: string; nombre: string; total: number; completadas: number; horas: number }`. El componente solo lee `m.nombre`, `m.completadas`, `m.horas` y `m.total`, así que no hay nada más que tocar.
- `OverviewTab.tsx:82` — `key={m.id}`
- `HorasTab.tsx:20` — `key={r.id}`
- `EquipoTab.tsx:25` — `key={r.id}`
- `ReporteTab.tsx:34` — `{miembrosAsignables.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}`

- [ ] **Step 10: Verificar**

Run: `pnpm typecheck`
Expected: los errores restantes son **solo** de `useStratixData.ts`, `NewActivityModal.tsx`,
`ActivityDetailModal.tsx` (Task 6) y `features/admin/` (Task 7).

- [ ] **Step 11: Commit**

```bash
git add features/stratix-mkt/components/
git commit -m "refactor(stratix): las vistas resuelven el nombre por id

Trece componentes pasan de miembrosRef[ref] a miembrosPorId[responsable_id].
El fallback deja de ser el propio identificador y pasa a '—': con el ref,
imprimir la clave era legible; con un uuid no.

Por lo mismo, las tarjetas de horas y de reporte pierden el subtítulo que
mostraba el ref bajo el nombre — ahora el nombre completo ya identifica a
la persona."
```

---

### Task 6: Formulario y hook de Stratix

Acá entra el helper de la Task 1 y se cierra el flujo de creación.

**Files:**
- Modify: `features/stratix-mkt/hooks/useStratixData.ts:9-13`, `:16`, `:74-79`, `:92-94`, `:97-107`, `:134`, `:138`, `:151-152`
- Modify: `features/stratix-mkt/components/modals/NewActivityModal.tsx:3`, `:7`, `:21-25`, `:56-58`, `:63-65`
- Modify: `features/stratix-mkt/components/modals/ActivityDetailModal.tsx:2`, `:9`, `:16-17`

**Interfaces:**
- Consumes: `esActividadDeMiembro` (Task 1); `miembrosPorId` / `miembrosAsignables` (Task 3);
  `NuevaActForm`, `ResumenHoras`, `Actividad` (Task 4).
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Defaults del formulario**

En `useStratixData.ts`, el estado inicial deja de traer refs hardcodeados. La marca y el
responsable los completan los `useEffect` de sincronización de `NewActivityModal`, que ya
existen para eso; el solicitante arranca en el usuario logueado.

```ts
import { esActividadDeMiembro } from '../report-filter'

const emptyNuevaAct = (solicitanteId = ''): NuevaActForm => ({
  titulo: '', descripcion: '', empresa: '', responsable_id: '',
  mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '',
  estado: 'Pendiente', fecha_entrega: '', solicitante_id: solicitanteId, drive_url: '',
})
```

Línea 16 — el destructuring del contexto:

```ts
  const { usuario, actividades, equipo, usuarios, esAdmin, mostrarMensaje, setActividades, miembrosPorId, miembrosAsignables, colorMarca } = useApp()
```

Línea ~31 — el estado inicial y los dos `setNuevaAct(emptyNuevaAct())` del archivo pasan a
`emptyNuevaAct(usuario?.id || '')`:

```ts
  const [nuevaAct, setNuevaAct] = useState<NuevaActForm>(emptyNuevaAct(usuario?.id || ''))
```

- [ ] **Step 2: Resúmenes por miembro**

Líneas ~74-80 — `refsTeam` pasa a ser una lista de ids y `datosPorMiembro` la consume. La
línea 81 (`maxMiembro`) no cambia:

```ts
  const idsTeam = esAdmin ? miembrosAsignables.map((m) => m.id) : [usuario?.id].filter(Boolean) as string[]
  const datosPorMiembro = idsTeam.map(id => ({
    id, nombre: miembrosPorId[id] ?? '—',
    total: actsFiltradas.filter(a => a.responsable_id === id).length,
    completadas: actsFiltradas.filter(a => a.responsable_id === id && a.estado === 'Completado').length,
    horas: Math.round(actsFiltradas.filter(a => a.responsable_id === id).reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10,
  })).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
```

Líneas ~92-94 — `resumenHoras`:

```ts
  const resumenHoras = idsTeam.map(id => {
    const acts = actsHoras.filter(a => a.responsable_id === id)
    return { id, nombre: miembrosPorId[id] ?? '—', total: acts.length, completadas: acts.filter(a => a.estado === 'Completado').length, horas: Math.round(acts.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10, dias: acts.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0) }
  }).filter(r => r.total > 0)
```

- [ ] **Step 3: El reporte usa el helper**

Líneas ~97-107 — los tres ternarios se reemplazan por una llamada:

```ts
  const idRep = miembroReporte || idsTeam[0] || ''
  const actsRep = actividades.filter(a => esActividadDeMiembro(a, idRep, mesReporte || undefined))
  const totalHorasRep = Math.round(actsRep.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
  const totalDiasRep = actsRep.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)
  const completadasRep = actsRep.filter(a => a.estado === 'Completado').length
  const nombreRep = miembrosPorId[idRep] ?? usuario?.nombre ?? '—'
```

`refRep` desaparece: buscar en el resto del archivo cualquier uso restante y cambiarlo por
`idRep`. El `<select>` que alimenta `miembroReporte` ya quedó apuntando a `m.id` en la
Task 5 (`ReporteTab.tsx:34`), así que el estado ahora guarda un uuid y encaja con `idRep`
sin más cambios.

- [ ] **Step 4: Payload de creación y notificación**

Líneas ~134, ~138:

```ts
        responsable_id: nuevaAct.responsable_id,
        ...
        solicitante_id: nuevaAct.solicitante_id || null,
```

Líneas ~151-152 — la notificación ya no necesita buscar al usuario por ref, el id **es** el
destinatario:

```ts
      if (data && nuevaAct.responsable_id && nuevaAct.responsable_id !== usuario?.id) {
        await notificacionesRepo.insert({ usuario_id: nuevaAct.responsable_id, tipo: 'tarea_asignada', titulo: 'New task assigned', mensaje: `"${nuevaAct.titulo}" — ${nuevaAct.empresa} · ${nuevaAct.mes}`, actividad_id: data.id, leida: false })
      }
```

Si tras esto `usuarios` queda sin usarse en el hook, sacarlo del destructuring de `useApp()`
(ESLint marca la variable sin usar).

- [ ] **Step 5: NewActivityModal**

Línea 3 — sacar `SOLICITANTES` del import y traer `usuarios` del contexto:

```tsx
import { useApp, MESES, COLUMNAS_KANBAN } from '@/shared/context/AppContext'
```

Línea 7:

```tsx
  const { s1, border, accent, t1, t2, t3, inputStyle, miembrosAsignables, marcas, usuarios } = useApp()
```

Líneas 21-25 — el `useEffect` de sincronización, ahora por id:

```tsx
  useEffect(() => {
    if (miembrosAsignables.length && !miembrosAsignables.some(m => m.id === nuevaAct.responsable_id)) {
      setNuevaAct(p => ({ ...p, responsable_id: miembrosAsignables[0].id }))
    }
  }, [miembrosAsignables, nuevaAct.responsable_id, setNuevaAct])
```

Líneas 56-58 — el select de responsable:

```tsx
            <select value={nuevaAct.responsable_id} onChange={e => setNuevaAct(p => ({ ...p, responsable_id: e.target.value }))} style={inputStyle}>
              {miembrosAsignables.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
```

Líneas 63-65 — el select de solicitante pasa a listar **todos los usuarios activos**, no
solo Marketing: el pedido puede venir de otra área o de un compañero del equipo.

```tsx
          <select value={nuevaAct.solicitante_id} onChange={e => setNuevaAct(p => ({ ...p, solicitante_id: e.target.value }))} style={inputStyle}>
            <option value="">—</option>
            {usuarios.filter(u => u.activo && u.id).map(u => (
              <option key={u.id} value={u.id as string}>{`${u.nombre || ''} ${u.apellido || ''}`.trim()}</option>
            ))}
          </select>
```

- [ ] **Step 6: ActivityDetailModal**

Línea 2 — sacar `SOLICITANTES` del import.
Línea 9 — `miembrosRef` → `miembrosPorId`.
Líneas 16-17:

```tsx
    { label: 'Assignee', value: miembrosPorId[modalVerAct.responsable_id] ?? '—' },
    { label: 'Requested by', value: miembrosPorId[modalVerAct.solicitante_id] ?? '—' },
```

- [ ] **Step 7: Verificar**

Run: `pnpm typecheck && pnpm vitest run`
Expected: typecheck falla **solo** en `features/admin/` (Task 7); los tests pasan.

- [ ] **Step 8: Commit**

```bash
git add features/stratix-mkt/
git commit -m "feat(stratix): el formulario y el reporte trabajan con ids

El reporte por miembro pasa a usar esActividadDeMiembro y pierde la
excepción hardcodeada de Coord_MFreddy. El select de solicitante deja de
leer SOLICITANTES y lista usuarios activos: el pedido puede venir de otra
área o de un compañero, no solo del director.

La notificación de tarea asignada deja de buscar al destinatario por ref
— el id del select ya es el destinatario."
```

---

### Task 7: Admin — herencia sin ref

**Files:**
- Modify: `features/admin/types.ts:18`
- Modify: `features/admin/components/DeleteUserModal.tsx:62`, `:65`, `:131`, `:148-157`
- Modify: `features/admin/components/OrgCard.tsx:19` (comentario)
- Modify: `features/admin/index.test.ts:29`, `:41`
- Modify: `app/api/admin/reassign-and-delete/route.ts:22`, `:40-52`, `:68`, `:108`
- Modify: `shared/i18n/locales/es.json:285`, `:299-301`
- Modify: `shared/i18n/locales/en.json:285`, `:299-301`

**Interfaces:**
- Consumes: `Usuario` sin `responsable_ref` (Task 4).
- Produces: el body de `POST /api/admin/reassign-and-delete` pasa a ser
  `{ oldId: string; newId?: string; statusOverride?: string | null }` — sin `newRef`.
  La Task 8 lo verifica en el navegador.

- [ ] **Step 1: Actualizar el test de admin**

En `features/admin/index.test.ts`, sacar `responsable_ref` de las dos fixtures:

Línea 29: `{ id: 'a', rol: 'stratix360', activo: true, nombre: 'Ana' },`
Línea 41: `const users = [target, { id: 'f', rol: 'admin', activo: true, nombre: 'Freddy', email: freddyEmail }] as AdminUser[]`

- [ ] **Step 2: Correr los tests**

Run: `pnpm vitest run features/admin/index.test.ts`
Expected: PASS — `eligibleHeirs` nunca miró el ref, así que sacarlo de las fixtures no
cambia nada. Confirma que la elegibilidad ya era independiente del ref y que el bloqueo
vivía solo en la UI.

- [ ] **Step 3: Tipo de AdminUser**

En `features/admin/types.ts` línea 18, sacar `| 'responsable_ref'` del `Pick`.

- [ ] **Step 4: DeleteUserModal**

Línea 62 — borrar la guarda entera:

```ts
    if (!heir.responsable_ref) { setDeleteError(t('admin.del.heirNoRef', { name: `${heir.nombre} ${heir.apellido}` })); return }
```

Línea 65 — sacar `newRef` del body:

```ts
      const { res, result } = await apiPost<{ ok?: boolean; error?: string; transferred?: number }>('/api/admin/reassign-and-delete', { oldId, newId: heir.id, statusOverride: reassignState.statusOverride || null })
```

Línea 131:

```ts
    const heirReady = !!selectedHeir
```

Líneas 148-157 — la `<option>` deja de deshabilitarse y el bloque de hint se borra entero:

```tsx
              ) : heirs.map(h => (
                <option key={h.id} value={h.id}>
                  {h.nombre} {h.apellido}
                </option>
              ))}
            </select>
          </div>
```

(El `{selectedHeir && !selectedHeir.responsable_ref && (...)}` completo se elimina.)

- [ ] **Step 5: Ruta API**

En `app/api/admin/reassign-and-delete/route.ts`:

Línea 22 — borrar la línea del docblock que documenta `newRef`.

Líneas 40-52:

```ts
    const { oldId, newId, statusOverride } = body as {
      oldId?: string; newId?: string; statusOverride?: string | null
    }

    // Heredero OPCIONAL: sin heredero (newId ausente) el RPC solo limpia hijos y
    // borra — caso de usuario con 0 tareas.
    if (!oldId) {
      return NextResponse.json({ error: 'oldId es requerido.' }, { status: 400 })
    }
```

(el bloque `if (newId && !newRef)` se elimina completo)

Línea 68: `console.log(`${TAG} start`, { oldId, newId, statusOverride: statusOverride ?? null })`

Línea 108 — borrar `p_new_ref: newRef ?? null,` de los argumentos del `rpc`.

- [ ] **Step 6: Comentario de OrgCard**

`features/admin/components/OrgCard.tsx` línea 19 — el comentario dice "para cualquier otro
vienen filtradas por responsable_ref". Reemplazar esa frase por "para cualquier otro vienen
filtradas por `responsable_id`".

- [ ] **Step 7: Borrar las claves i18n muertas**

En `shared/i18n/locales/es.json` **y** `shared/i18n/locales/en.json`, borrar las cuatro
claves: `admin.del.heirNoRef`, `admin.del.notEligibleSuffix`, `admin.del.heirNoRefHint1`,
`admin.del.heirNoRefHint2`.

Verificar que no quedan referencias:

```bash
grep -rn "heirNoRef\|notEligibleSuffix" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules
```

Expected: sin resultados.

- [ ] **Step 8: Verificar**

Run: `pnpm typecheck && pnpm lint && pnpm vitest run`
Expected: los tres pasan. Es el primer punto del plan donde el árbol está limpio.

- [ ] **Step 9: Commit**

```bash
git add features/admin/ app/api/admin/reassign-and-delete/route.ts shared/i18n/locales/
git commit -m "feat(admin): todos los usuarios pueden heredar tareas

eligibleHeirs nunca miró responsable_ref — el bloqueo vivía solo en la UI,
que deshabilitaba a quien no tuviera ref. Con la FK esa restricción no
tiene sentido: se van la guarda, la option deshabilitada, el hint y sus
cuatro claves i18n, más el parámetro newRef de la ruta y del RPC."
```

---

### Task 8: Migración de drop, seed y verificación final

Cierra la fase: recién acá desaparecen las columnas, cuando ya nada las lee.

**Files:**
- Create: `supabase/migrations/<timestamp>_drop_responsable_ref.sql`
- Modify: `supabase/seed/equipo_marketing_dev.sql`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: el esquema final. `admin_reassign_and_delete(p_old_id uuid, p_new_id uuid,
  p_status_override text)` — tres parámetros.

- [ ] **Step 1: Crear la migración**

```bash
pnpm supabase migration new drop_responsable_ref
```

Escribir en el archivo generado:

```sql
-- Elimina los refs de texto: el código ya trabaja con las FK uuid.
--
-- El ref venía del dump del esquema original. Codificaba cargo + nombre —datos
-- que ya viven en usuario_cargos/cargos y usuarios.nombre— y por eso se
-- desincronizaba (DG_Ariana quedó con el nombre viejo de Arianna). Nunca fue
-- UNIQUE ni NOT NULL: 3 de 10 personas no tenían, y eso las dejaba fuera de ser
-- responsables o herederas.
--
-- Requiere la migración de backfill previa. IRREVERSIBLE.

-- Toda actividad tiene responsable: la integridad que el ref nunca dio.
ALTER TABLE public.actividades ALTER COLUMN responsable_id SET NOT NULL;

-- solicitante_id queda NULLABLE a propósito: el RPC lo anula al borrar al
-- solicitante, y una actividad sin quien la pidió es un estado válido.

ALTER TABLE public.actividades
  DROP COLUMN responsable_ref,
  DROP COLUMN solicitado_por;
ALTER TABLE public.usuarios DROP COLUMN responsable_ref;

-- El RPC pierde p_new_ref. La firma cambia, así que CREATE OR REPLACE no basta:
-- dejaría viva la sobrecarga de 4 argumentos y la ruta API podría pegarle a la
-- vieja. DROP explícito con la firma completa.
DROP FUNCTION IF EXISTS public.admin_reassign_and_delete(uuid, uuid, text, text);

CREATE FUNCTION public.admin_reassign_and_delete(
  p_old_id uuid,
  p_new_id uuid DEFAULT NULL,
  p_status_override text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old_name       text;
  v_transferred    int := 0;
  v_notifs_deleted int := 0;
  v_set_estado     text := NULL;
  v_stamp          text;
BEGIN
  SELECT nombre_display INTO v_old_name
    FROM public.usuarios WHERE id = p_old_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario a borrar % no existe', p_old_id;
  END IF;

  IF p_new_id IS NOT NULL THEN
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
            || ' el ' || to_char(now() AT TIME ZONE 'America/Guayaquil', 'YYYY-MM-DD');

    UPDATE public.actividades
       SET responsable_id  = p_new_id,
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
  ELSE
    IF EXISTS (SELECT 1 FROM public.actividades WHERE responsable_id = p_old_id) THEN
      RAISE EXCEPTION 'El usuario tiene actividades; se requiere un heredero';
    END IF;
  END IF;

  UPDATE public.actividades SET solicitante_id  = NULL WHERE solicitante_id  = p_old_id;
  UPDATE public.actividades SET aprobado_por_id = NULL WHERE aprobado_por_id = p_old_id;
  UPDATE public.usuarios    SET validado_por    = NULL WHERE validado_por    = p_old_id;

  DELETE FROM public.notificaciones WHERE usuario_id = p_old_id;
  GET DIAGNOSTICS v_notifs_deleted = ROW_COUNT;

  BEGIN DELETE FROM public.solicitudes WHERE usuario_id = p_old_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM public.marcaciones WHERE usuario_id = p_old_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  DELETE FROM public.usuarios WHERE id = p_old_id;

  RETURN jsonb_build_object(
    'ok', true,
    'transferred', v_transferred,
    'notifs_deleted', v_notifs_deleted
  );
END;
$$;

ALTER FUNCTION public.admin_reassign_and_delete(uuid, uuid, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.admin_reassign_and_delete(uuid, uuid, text) TO anon;
GRANT ALL ON FUNCTION public.admin_reassign_and_delete(uuid, uuid, text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_reassign_and_delete(uuid, uuid, text) TO service_role;
```

> **Antes de escribir el bloque del RPC, abrir
> `supabase/migrations/20260626210000_reassign_optional_heir.sql` y comparar cuerpo contra
> cuerpo.** El de arriba es ese mismo, menos `v_old_ref`, menos
> `SET responsable_ref = p_new_ref` y menos el `(ref)` del sello `notas_jefe`. Si el archivo
> original tiene limpiezas adicionales al final (bloques `BEGIN ... EXCEPTION WHEN
> undefined_table`), copiarlas también: la lista de arriba puede estar incompleta.

- [ ] **Step 2: Aplicar en local**

```bash
pnpm supabase migration up
```

Expected: aplica sin error. Si falla con `column "responsable_id" contains null values`, el
backfill de la Task 2 no cubrió todo: revisar antes de seguir.

- [ ] **Step 3: Verificar el esquema resultante**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
SELECT column_name FROM information_schema.columns
 WHERE table_name IN ('actividades','usuarios') AND column_name IN ('responsable_ref','solicitado_por');"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
SELECT count(*) sobrecargas FROM pg_proc WHERE proname = 'admin_reassign_and_delete';"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
SELECT count(*) total, count(responsable_id) con_resp FROM actividades;"
```

Expected: la primera devuelve `(0 rows)`; `sobrecargas = 1`; `total 18 · con_resp 18`.

- [ ] **Step 4: Actualizar el seed**

En `supabase/seed/equipo_marketing_dev.sql`: sacar `responsable_ref` del `INSERT`, la
columna `ref` del `VALUES`, el `UPDATE` del ref de Jonathan, y cambiar el `WHERE` del líder
de equipo por el email. El archivo queda:

```sql
-- SEED dev/local del equipo de marketing. NO es una migración (no versionar en prod).
-- Requiere la migración estructura_equipos_cargos aplicada. Idempotente por email.
-- Prod NO usa este seed: allá el equipo se backfillea sobre usuarios ya existentes.

INSERT INTO public.usuarios (email, nombre, apellido, rol, activo, auth_id, equipo_id, cargo_id, color)
SELECT v.email, v.nombre, v.apellido, 'stratix360', v.activo, NULL,
       CASE WHEN v.en_equipo THEN e.id ELSE NULL END,
       c.id, v.color
FROM (VALUES
  -- nombre, apellido, email, cargo, activo, en_equipo(MKT), color
  ('Freddy','Crespín','freddy@eminat.net','Director de Marketing',        true,  true,  '#7C6FF7'),
  ('Joselyne','Guerrero','joselyne@eminat.net','Lead Designer',           true,  true,  '#F472B6'),
  ('Arianna','Sig-Tú','arianna@eminat.net','Graphic Designer',            true,  true,  '#A78BFA'),
  ('Angie','Núñez','angie@eminat.net','Graphic Designer',                 true,  true,  '#60A5FA'),
  ('David','Falconi','david@eminat.net','Lead Editor & Animations',       true,  true,  '#34D399'),
  ('Bryan','Núñez','bryan@eminat.net','Video Editor',                     true,  true,  '#FB923C'),
  ('Tasha','Palomino','tasha@eminat.net','Video Editor',                  true,  true,  '#F87171'),
  ('Wagner','Dueñas','wagner@eminat.net','Full Stack Developer',          true,  true,  '#FBB040'),
  ('Naomi','Panchana','naomi@eminat.net','Ejecutiva de Cuentas & CM',     true,  true,  '#60A5FA'),
  -- Inactivo: sus actividades históricas siguen resolviendo el nombre por FK
  ('Jonathan','Bula','jonathan@eminat.net','',                            false, false, '#9494B3')
) AS v(nombre, apellido, email, cargo, activo, en_equipo, color)
LEFT JOIN public.cargos c ON c.nombre = v.cargo
CROSS JOIN public.equipos e
WHERE e.codigo = 'MKT-GEN'
ON CONFLICT (email) DO NOTHING;

-- Líder del equipo Marketing = Freddy
UPDATE public.equipos
SET lider_id = (SELECT id FROM public.usuarios WHERE email = 'freddy@eminat.net')
WHERE codigo = 'MKT-GEN';
```

- [ ] **Step 5: Barrido final de referencias muertas**

```bash
grep -rn "responsable_ref\|solicitado_por\|SOLICITANTES\|miembrosRef\|newRef\|p_new_ref" \
  --include="*.ts" --include="*.tsx" --include="*.json" . 2>/dev/null \
  | grep -v node_modules | grep -v "supabase/migrations/" | grep -v "supabase/rollback/"
```

Expected: sin resultados. Las migraciones viejas y los dumps sí conservan las menciones —
son historia, no se tocan.

- [ ] **Step 6: Gates**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: los tres pasan. Los tests suben de 118 a ~124 (7 nuevos del helper, +1 en
derivaciones, −1 renombrado).

- [ ] **Step 7: QA manual en el navegador**

`pnpm dev` y verificar los tres flujos que tocan la FK. Los tres son necesarios: ninguno lo
cubren los tests.

1. **Stratix → Team → reporte por miembro.** Las cifras no se mueven: Bryan 4, Joselyne 4,
   Naomi 3, Arianna 3, David 3, Freddy 18. Los nombres salen como "Bryan Núñez", no como
   refs ni uuids.
2. **Stratix → New task.** El select de responsable ofrece **9 personas** (las 6 de antes
   más Angie, Tasha y Wagner); el de solicitante ofrece a todos los usuarios activos. Crear
   una tarea y confirmar en la DB que guardó los dos uuid:
   ```bash
   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
   SELECT titulo, responsable_id, solicitante_id FROM actividades ORDER BY created_at DESC LIMIT 1;"
   ```
3. **Admin → borrar un usuario con tareas.** Todos los herederos aparecen habilitados (antes
   los sin ref salían deshabilitados). Elegir uno y confirmar: el mensaje debe reportar el
   número **real** de tareas transferidas — hoy reporta 0. Verificar en la DB que las
   actividades cambiaron de `responsable_id`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/ supabase/seed/equipo_marketing_dev.sql
git commit -m "feat(db): elimina responsable_ref y solicitado_por

Las tres columnas de texto se van y responsable_id pasa a NOT NULL: toda
actividad tiene responsable, la integridad que el ref nunca dio.

El RPC se recrea sin p_new_ref. La firma cambia, así que va DROP explícito
en vez de CREATE OR REPLACE — este último dejaría viva la sobrecarga de
cuatro argumentos.

El seed identifica a las personas por email."
```

---

## Antes de `db push` a dev y a prod

**No hacerlo como parte de este plan.** Queda para cuando la rama se mergee, y exige correr
en **cada** entorno, antes de pushear:

```sql
SELECT DISTINCT a.responsable_ref FROM actividades a
 LEFT JOIN usuarios u ON u.responsable_ref = a.responsable_ref
 WHERE u.id IS NULL;
```

Si devuelve filas, el `SET NOT NULL` aborta la migración a mitad de camino y **no hay
rollback**: hay que crear esos usuarios o corregir los refs antes. Correr también la variante
con `a.solicitado_por` — esa no aborta nada, pero los solicitantes que no resuelvan se
pierden en silencio como NULL.

Tomar un `pg_dump` de `actividades` y `usuarios` en cada entorno antes del push.

**Las dos tablas, no solo `actividades`.** El backup local de esta fase cubrió solo
`actividades`, y eso no alcanza: la migración también dropea `usuarios.responsable_ref`. Sin
el dump de `usuarios` no hay forma de reconstruir el mapeo ref → persona, que es justamente
lo que permitiría rehacer el backfill si algo sale mal.

**Gotcha de entorno: el `pg_dump` del host es v14 y el servidor es Postgres 17.** Un
`pg_dump` directo aborta con `server version mismatch`. Hay que correrlo **dentro del
contenedor**, que trae el binario de la versión correcta:

```bash
docker exec supabase_db_eminat-app pg_dump -U postgres -d postgres \
  -t public.actividades -t public.usuarios --data-only \
  > supabase/rollback/predump-responsable-ref-YYYYMMDD.sql
```

Contra dev/prod, mismo criterio: usar un cliente v17 (el del contenedor sirve, pasándole la
connection string del proyecto con `-d`) o `pnpm supabase db dump --linked`, que no depende
del `pg_dump` del host.

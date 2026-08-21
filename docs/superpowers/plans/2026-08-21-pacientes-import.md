# Registro de pacientes + import de 3 sistemas clínicos — Plan de implementación

> **Para quien ejecute esto:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan
> checkbox (`- [ ]`) para el seguimiento.

**Goal:** Que Medical guarde pacientes en la base y que los ~5.000 del registro de eClinicalWorks,
eClinPro y eMedicalPractice entren por un import que detecta duplicados y deja decidir las
fusiones.

**Architecture:** Dos tablas nuevas (`pacientes`, `paciente_fuentes`) con RLS por módulo. El import
genérico de Research —parser, mapeo de headers, plan de insert/update— sube a `src/shared/import/`
con la identidad como parámetro; Medical aporta sus normalizadores y su regla de identidad. El
modal compartido crece de 4 a 6 pasos (hoja, saneamiento).

**Tech Stack:** Next.js 14 · TypeScript · Supabase (Postgres 17) · vitest · SheetJS

**Spec:** `docs/superpowers/specs/2026-08-21-pacientes-import-design.md` — leerlo entero antes de
la Tarea 1. El plan argumenta desde el spec y no lo repite.

## Global Constraints

Copiadas del spec y de `.claude/rules/`. Aplican a **todas** las tareas.

- **`any` está prohibido** (ESLint `no-explicit-any: error`). La salida es `Pick`/`Omit`/`Partial`
  o `unknown` con narrowing.
- **Nada de `../../`** — fuera del vecindario se importa con `@/features/…` o `@/shared/…`.
- **Un componente es una carpeta**: `index.tsx` + `index.module.css` + `index.test.tsx`.
- **El atributo `style` está prohibido**, salvo para pasar un DATO como variable CSS.
- **i18n**: todo texto visible usa `useT()`/`t()` con la clave en `es.json` **y** `en.json`.
  Incluye los mensajes de error y de éxito. Nada de `i18n-ignore`.
- **`src/shared/` no importa de `src/features/`**. Si hace falta, falta un prop.
- **Vitest corre sin DOM**: no hay `jsdom` ni `@testing-library/react`. **Todo test de este plan
  es sobre funciones puras.** No escribir tests que monten componentes.
- **Nunca `pnpm supabase db reset`.** Para aplicar migraciones en local: `pnpm supabase migration up`.
- **Verificación**: `pnpm typecheck` y `pnpm test` antes de cada commit. Para el build,
  `pnpm build:check` — **nunca `next build`** con el dev server levantado.
- **Commits por ruta**: `git commit ruta/uno.ts ruta/dos.ts -m "…"`. Nunca `git add -A`, y la ruta
  va también en el `commit`, no solo en el `add`.
- **Valores canónicos**: `'M'`, `'activo'`, `'ecw'`. La constante nunca se renderiza; la etiqueta
  sale de i18n.

---

## Estructura de archivos

Qué se crea y de qué es responsable cada archivo.

```
supabase/migrations/<ts>_pacientes.sql     ← Tarea 1

src/shared/data/
  tables.ts                (modificar)     ← + pacientes, pacienteFuentes
  paginated.ts             (crear)         ← listAllRows<T>, genérico y sin dominio

src/features/medical/
  types.ts                 (modificar)     ← Paciente con los campos nuevos
  constants/index.ts       (mover+modif.)  ← GENERO_META / ESTADO_PACIENTE_META / FUENTE_META
  utils/normalizers/
    index.ts  index.test.ts (crear)        ← mojibake, serial→fecha, teléfono, caja, género
  utils/pacienteIdentity/
    index.ts  index.test.ts (crear)        ← parseo por fuente, clave_origen, matcheo, fusión
  utils/pacienteFields.ts  (crear)         ← PACIENTE_FIELD_DEFS (columna, tipo, labelKey)
  hooks/usePacientes.ts    (crear)         ← estado + CRUD contra la data layer
  components/PacienteModal.tsx (modificar) ← selects desde los catálogos, placeholder vacío
  components/PatientRow.tsx    (modificar) ← generoLabel/estadoLabel en vez del texto crudo
  components/PatientDetail.tsx (modificar) ← idem: pinta genero y estado crudos

src/shared/import/
  parseWorkbook/  index.ts  index.test.ts  ← xlsx → { hojas, headers, rows }
  identity.ts                              ← tipos de la identidad parametrizable
  buildImportPlan/ index.ts index.test.ts  ← el de Research, con la identidad inyectada
  ImportModal/ index.tsx index.module.css  ← el modal de 6 pasos
  SheetPicker/ SanitizeRow/ MergeCandidateRow/

src/features/research/
  utils/importPlan.ts      (modificar)     ← pasa a delegar en @/shared/import
  components/leads/ImportModal.tsx (borrar)← lo reemplaza el compartido
```

---

# FASE 1 — La base

Al terminar esta fase Medical persiste pacientes reales. Sin import todavía: se cargan por el
formulario, que es lo que la regla de datos de prueba pide.

## Task 1: La migración

**Files:**
- Create: `supabase/migrations/<timestamp>_pacientes.sql` (el timestamp lo genera la CLI)

**Interfaces:**
- Produces: tablas `public.pacientes` y `public.paciente_fuentes`; dominios `public.genero`,
  `public.estado_paciente`, `public.fuente_paciente`.

- [ ] **Step 1: Crear el archivo de migración**

```bash
pnpm supabase migration new pacientes
```

- [ ] **Step 2: Escribir el DDL**

Copiar **textual** el bloque SQL de la sección "Esquema" del spec. No reescribirlo de memoria: cada
detalle está ahí por un defecto que se encontró ejecutándolo. En particular no cambiar
`(SELECT public.has_module(…))` por la versión sin paréntesis, ni `to_char(…,'FM000000')` por
`lpad`, ni `ON DELETE SET NULL` por `CASCADE`.

- [ ] **Step 3: Aplicar en local**

```bash
pnpm supabase migration up
```

Esperado: aplica sin error. Si la CLI se queja de historial desalineado, **no** correr
`migration repair` ni `db pull` (reescriben el historial de la rama): aplicar el `.sql` por psql,
que es idempotente por diseño.

- [ ] **Step 4: Verificar que el DDL hizo lo que dice**

```bash
docker exec supabase_db_eminat-app psql -U postgres -d postgres -c "\d public.pacientes" \
  -c "\d public.paciente_fuentes" \
  -c "\dp public.pacientes" \
  -c "SELECT typname FROM pg_type WHERE typname IN ('genero','estado_paciente','fuente_paciente');"
```

Esperado, y hay que mirarlo de verdad:
- `pacientes` con `mrn` UNIQUE NOT NULL y los dos CHECK de no-vacío.
- `paciente_fuentes` con `PRIMARY KEY (fuente, clave_origen)` y `paciente_id` **nullable**.
- `\dp` muestra `authenticated` y `service_role` con `arwd`. **Si esta línea está vacía, los
  GRANT no entraron y el módulo va a fallar en la nube aunque en local ande.**
- Los tres dominios existen.

- [ ] **Step 5: Verificar la idempotencia**

```bash
docker exec supabase_db_eminat-app psql -U postgres -d postgres \
  -f /dev/stdin < supabase/migrations/*_pacientes.sql
```

Esperado: corre por segunda vez **sin error**. Si aborta con `type "genero" already exists` o
`relation … already exists`, falta un guard.

- [ ] **Step 6: Verificar la RLS desde una sesión que no sea admin**

```bash
docker exec supabase_db_eminat-app psql -U postgres -d postgres -c "
  BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT count(*) FROM public.pacientes;
  ROLLBACK;"
```

Esperado: `0` sin error de permisos. Un `permission denied` acá significa que faltan los GRANT.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/*_pacientes.sql
git commit supabase/migrations/*_pacientes.sql -m "feat(medical): tablas pacientes y paciente_fuentes con RLS por módulo

Medical no tocaba la base: los pacientes vivían en un useState. La PK sobre
(fuente, clave_origen) es la garantía de idempotencia del import que viene
después, y el ON DELETE SET NULL deja una tumba para que borrar un paciente no
lo resucite en la siguiente carga."
```

---

## Task 2: Los catálogos de dominio en TypeScript

**Files:**
- Move: `src/features/medical/constants.ts` → `src/features/medical/constants/index.ts`
  (con `git mv`, para conservar el historial)
- Create: `src/features/medical/constants/index.test.ts`
- Modify: `src/features/medical/types.ts:1-19`
- Modify: `src/shared/i18n/locales/es.json`, `src/shared/i18n/locales/en.json`

**Por qué pasa a carpeta:** `componentes.md` exime de ser carpeta a "un módulo de constantes",
y este deja de serlo en cuanto le entran `generoLabel` y compañía — funciones con test. Ningún
importador cambia: `'../constants'` y `@/features/medical/constants` resuelven el `index.ts`
igual, así que el `git mv` no toca a ninguno de sus llamadores.

**Interfaces:**
- Produces: `GENERO_META`, `ESTADO_PACIENTE_META`, `FUENTE_META`, `GENEROS`, `ESTADOS_PACIENTE`,
  `generoLabel(v, t)`, `estadoPacienteLabel(v, t)`, `fuenteLabel(v, t)`, y los tipos
  `Genero = 'M'|'F'|'NB'|'ND'`, `EstadoPaciente`, `FuentePaciente`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/medical/constants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GENERO_META, GENEROS, generoLabel, ESTADOS_PACIENTE, FUENTES } from './constants'

describe('catálogos de Medical', () => {
  it('deriva las listas del objeto META, en orden', () => {
    expect(GENEROS).toEqual(['M', 'F', 'NB', 'ND'])
    expect(ESTADOS_PACIENTE).toEqual(['activo', 'inactivo', 'alta'])
    expect(FUENTES).toEqual(['ecw', 'eclinpro', 'emed', 'manual'])
  })

  it('los valores canónicos coinciden con los DOMAIN de la migración', () => {
    // Si esto falla, la base y el front listan cosas distintas y el insert va a
    // reventar con "violates check constraint" recién en runtime.
    expect(Object.keys(GENERO_META)).toEqual(['M', 'F', 'NB', 'ND'])
  })

  it('traduce por clave i18n y NUNCA devuelve el valor canónico', () => {
    const t = (k: string) => `[${k}]`
    expect(generoLabel('M', t)).toBe('[med.genero.M]')
    expect(generoLabel('F', t)).toBe('[med.genero.F]')
  })

  it('un valor desconocido no rompe: devuelve el crudo como último recurso', () => {
    const t = (k: string) => `[${k}]`
    expect(generoLabel('XX', t)).toBe('XX')
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm test -- constants.test.ts`
Esperado: FAIL, `GENERO_META is not exported`.

- [ ] **Step 3: Escribir los catálogos**

En `src/features/medical/constants.ts`, **reemplazar** las líneas de `GENEROS` y `SEGUROS`:

```ts
import type { I18nKey } from '@/shared/i18n'

type MetaEntry = { labelKey: I18nKey; color?: string }

// Los valores canónicos son los de los DOMAIN de la migración de pacientes.
// Agregar un valor es agregar una fila acá Y en el DOMAIN: las dos mitades listan lo mismo.
export const GENERO_META = {
  M:  { labelKey: 'med.genero.M'  },
  F:  { labelKey: 'med.genero.F'  },
  NB: { labelKey: 'med.genero.NB' },
  ND: { labelKey: 'med.genero.ND' },
} as const satisfies Record<string, MetaEntry>

export const ESTADO_PACIENTE_META = {
  activo:   { labelKey: 'med.estadoPaciente.activo',   color: '#34D399' },
  inactivo: { labelKey: 'med.estadoPaciente.inactivo', color: '#94A3B8' },
  alta:     { labelKey: 'med.estadoPaciente.alta',     color: '#60A5FA' },
} as const satisfies Record<string, MetaEntry>

export const FUENTE_META = {
  ecw:      { labelKey: 'med.fuente.ecw'      },
  eclinpro: { labelKey: 'med.fuente.eclinpro' },
  emed:     { labelKey: 'med.fuente.emed'     },
  manual:   { labelKey: 'med.fuente.manual'   },
} as const satisfies Record<string, MetaEntry>

export type Genero = keyof typeof GENERO_META
export type EstadoPaciente = keyof typeof ESTADO_PACIENTE_META
export type FuentePaciente = keyof typeof FUENTE_META

export const GENEROS = Object.keys(GENERO_META) as Genero[]
export const ESTADOS_PACIENTE = Object.keys(ESTADO_PACIENTE_META) as EstadoPaciente[]
export const FUENTES = Object.keys(FUENTE_META) as FuentePaciente[]

type T = (key: string) => string

// El valor canónico NUNCA se renderiza. Si no está en el catálogo se devuelve crudo:
// una fila con un valor viejo tiene que verse, no desaparecer.
const label = (meta: Record<string, MetaEntry>, v: string, t: T) =>
  meta[v] ? t(meta[v].labelKey) : v

export const generoLabel = (v: string, t: T) => label(GENERO_META, v, t)
export const estadoPacienteLabel = (v: string, t: T) => label(ESTADO_PACIENTE_META, v, t)
export const fuenteLabel = (v: string, t: T) => label(FUENTE_META, v, t)
```

**`SEGUROS` se deja como está** — sigue siendo texto libre en la columna `seguro`, y este plan no
lo toca.

- [ ] **Step 4: Agregar las claves i18n**

En `src/shared/i18n/locales/es.json`:

```json
"med.genero.M": "Masculino",
"med.genero.F": "Femenino",
"med.genero.NB": "No binario",
"med.genero.ND": "Prefiere no decir",
"med.estadoPaciente.activo": "Activo",
"med.estadoPaciente.inactivo": "Inactivo",
"med.estadoPaciente.alta": "Alta médica",
"med.fuente.ecw": "eClinicalWorks",
"med.fuente.eclinpro": "eClinPro",
"med.fuente.emed": "eMedicalPractice",
"med.fuente.manual": "Carga manual"
```

En `src/shared/i18n/locales/en.json`:

```json
"med.genero.M": "Male",
"med.genero.F": "Female",
"med.genero.NB": "Non-binary",
"med.genero.ND": "Prefer not to say",
"med.estadoPaciente.activo": "Active",
"med.estadoPaciente.inactivo": "Inactive",
"med.estadoPaciente.alta": "Discharged",
"med.fuente.ecw": "eClinicalWorks",
"med.fuente.eclinpro": "eClinPro",
"med.fuente.emed": "eMedicalPractice",
"med.fuente.manual": "Manual entry"
```

- [ ] **Step 5: Actualizar el tipo `Paciente`**

En `src/features/medical/types.ts`, reemplazar la interfaz `Paciente`:

```ts
import type { Genero, EstadoPaciente, FuentePaciente } from './constants'

export interface Paciente {
  id: string
  mrn: string
  nombre: string
  apellido: string
  fecha_nacimiento: string | null
  genero: Genero | null
  telefono: string | null
  telefono_alt: string | null
  email: string | null
  seguro: string | null
  seguro_id: string | null
  direccion: string | null
  estado: EstadoPaciente
  alergias: string | null
  condiciones: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface PacienteFuente {
  paciente_id: string | null
  fuente: FuentePaciente
  clave_origen: string
  nombre_origen: string | null
  ref_externa: string | null
  importado_at: string
}
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `pnpm test -- constants.test.ts`
Esperado: PASS, 4 tests.

- [ ] **Step 7: Arreglar lo que el typecheck rompa**

Run: `pnpm typecheck`

`demo-data.ts` va a romper (usa `'Femenino'` y campos que ahora son nullable) y `PacienteModal.tsx`
también (importa `GENEROS` esperando etiquetas). Arreglar `demo-data.ts` cambiando los valores a
los canónicos (`'F'`, `'M'`); `PacienteModal` se arregla entero en la Tarea 4, así que acá basta
con que compile.

- [ ] **Step 8: Commit**

```bash
git commit src/features/medical/constants.ts src/features/medical/constants.test.ts \
  src/features/medical/types.ts src/features/medical/demo-data.ts \
  src/shared/i18n/locales/es.json src/shared/i18n/locales/en.json \
  -m "feat(medical): genero, estado y fuente pasan a objetos META con clave i18n

El Kanban de Stratix rotulaba sus columnas en español con la app en inglés por
renderizar la constante directo. Acá el canónico ('M') es lo que se guarda y lo
que se ve sale de i18n. Un valor fuera del catálogo se devuelve crudo en vez de
desaparecer: una fila vieja tiene que verse."
```

---

## Task 3: La capa de datos

**Files:**
- Modify: `src/shared/data/tables.ts:4-24`
- Create: `src/shared/data/paginated.ts` — el bucle de paginación, genérico y sin dominio
- Create: `src/features/medical/data/pacientes.ts` — las funciones tipadas de pacientes

**Por qué dos archivos y no uno.** La primera versión de esta tarea ponía todo en
`src/shared/data/pacientes.ts` con `import type { Paciente } from '@/features/medical/types'`.
Eso habría sido **el primer archivo de `src/shared/` en importar de `src/features/`** en todo el
repo (verificado: hoy son cero), rompiendo la restricción global y encadenando el módulo
compartido al dominio de Medical. Y contradecía al spec, que ubica el archivo en
`src/features/medical/data/pacientes.ts`.

El corte es el de siempre: **lo genérico arriba, el dominio abajo.** `listAllRows<T>(tabla, orden)`
no sabe qué es un paciente y va a `src/shared/data/paginated.ts`; `listPacientes()` y compañía
saben de `Paciente` y viven en Medical.

No es generalidad de más: `src/shared/data/research.ts:11` hace hoy `.select('*')` sin `.range()`,
así que tiene el mismo bug de `max_rows` latente — no muerde porque Research tiene 35 leads.
El helper ya tiene su segundo consumidor identificado.

**Interfaces:**
- Consumes: `TABLES` de `@/shared/data/tables`.
- Produces:
  - `listPacientes(): Promise<Paciente[]>` — **paginada**, devuelve todas las filas.
  - `insertPaciente(data): Promise<{ data, error }>`
  - `updatePaciente(id, data)`
  - `upsertPacientes(rows: Paciente[])` — `onConflict: 'id'`
  - `upsertPacienteFuentes(rows: PacienteFuente[])` — `onConflict: 'fuente,clave_origen'`
  - `listPacienteFuentes(): Promise<PacienteFuente[]>` — paginada

- [ ] **Step 1: Agregar las tablas al catálogo de nombres**

En `src/shared/data/tables.ts`, dentro de `TABLES`:

```ts
  pacientes: 'pacientes',
  pacienteFuentes: 'paciente_fuentes',
```

- [ ] **Step 2: Escribir el helper genérico de paginación**

Crear `src/shared/data/paginated.ts`. **No importa nada de `src/features/`** — no sabe qué fila
está leyendo:

```ts
import { supabase } from '@/shared/db/supabase'

// PostgREST corta en `max_rows` (1000 en supabase/config.toml) y devuelve 200 OK con
// Content-Range, no un error: supabase-js no avisa nada. Sin paginar, el matcheo del
// import se calcularía contra 1.000 de 4.132 pacientes y duplicaría el resto EN SILENCIO.
const PAGE = 1000

export async function listAllRows<T>(tabla: string, orden: string): Promise<T[]> {
  const out: T[] = []
  for (let desde = 0; ; desde += PAGE) {
    const { data, error } = await supabase
      .from(tabla).select('*').order(orden).range(desde, desde + PAGE - 1)
    if (error) throw error
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) return out
  }
}
```

- [ ] **Step 3: Escribir la capa de datos de pacientes**

Crear `src/features/medical/data/pacientes.ts`:

```ts
import { supabase } from '@/shared/db/supabase'
import { TABLES } from '@/shared/data/tables'
import { listAllRows } from '@/shared/data/paginated'
import type { Paciente, PacienteFuente } from '../types'

export const listPacientes = () => listAllRows<Paciente>(TABLES.pacientes, 'apellido')
export const listPacienteFuentes = () => listAllRows<PacienteFuente>(TABLES.pacienteFuentes, 'fuente')

export const insertPaciente = (data: Partial<Paciente>) =>
  supabase.from(TABLES.pacientes).insert([data]).select().single()

export const updatePaciente = (id: string, data: Partial<Paciente>) =>
  supabase.from(TABLES.pacientes).update(data).eq('id', id).select().single()

export const deletePaciente = (id: string) =>
  supabase.from(TABLES.pacientes).delete().eq('id', id)

// El id lo genera el CLIENTE (crypto.randomUUID) para que el upsert sea idempotente: sin
// una clave sobre la que hacer onConflict, reintentar un lote insertaría todo de nuevo.
export const upsertPacientes = (rows: Partial<Paciente>[]) =>
  supabase.from(TABLES.pacientes).upsert(rows, { onConflict: 'id' }).select('id')

export const upsertPacienteFuentes = (rows: PacienteFuente[]) =>
  supabase.from(TABLES.pacienteFuentes).upsert(rows, { onConflict: 'fuente,clave_origen' })
```

- [ ] **Step 4: Verificar que compila**

Run: `pnpm typecheck`
Esperado: sin errores.

- [ ] **Step 5: Verificar la paginación contra la base local**

Este no se puede testear con vitest (necesita la base). Se verifica a mano en la consola del
navegador con el dev server levantado, **después** de la Tarea 4 cuando el módulo ya lea de acá.
Anotarlo como pendiente y seguir.

- [ ] **Step 6: Commit**

```bash
git add src/shared/data/paginated.ts src/features/medical/data/pacientes.ts
git commit src/shared/data/paginated.ts src/features/medical/data/pacientes.ts src/shared/data/tables.ts \
  -m "feat(medical): capa de datos de pacientes, con lectura paginada

max_rows=1000 y PostgREST trunca devolviendo 200 OK: sin .range() en bucle el
matcheo del import vería 1.000 de 4.132 pacientes y duplicaría el resto sin que
nada falle. El id lo genera el cliente para que el upsert por lotes sea
reintentable."
```

---

## Task 4: Medical lee y escribe en la base

**Files:**
- Create: `src/features/medical/hooks/usePacientes.ts`
- Modify: `src/features/medical/hooks/useMedicalData.ts:10-30`
- Modify: `src/features/medical/components/PacienteModal.tsx`
- Modify: `src/features/medical/components/PatientRow.tsx:23,26`
- Modify: `src/features/medical/components/PatientDetail.tsx:27,34`

**Tres cosas que hay que arrastrar de las tareas anteriores** (no están en el código que ves,
están en lo que ese código dejó de ser cierto):

1. **`addPaciente` de `useMedicalData.ts:73-86` hace tres cosas, no una.** Inserta, llama a
   `logAction('CREATE_RECORD', 'patient_registration', …)` —que es el **audit trail de HIPAA**— y
   muestra un mensaje. El reemplazo por el hook **no puede perder el `logAction`**: es una feature
   de cumplimiento sobre una tabla de PHI, y perderla no rompe nada visible. El mensaje, además,
   está hardcodeado en español (`Paciente ... registrado`): pasa a `t()` con su clave en los dos
   JSON.
2. **El MRN ya no se genera en el cliente.** `addPaciente` arma hoy `MRN-2024-${length+1}`; ahora
   lo pone la base por `DEFAULT`. El insert **no debe mandar `mrn`** — dos generadores sobre una
   columna `UNIQUE` chocan.
3. **Los dos componentes pintan valores canónicos crudos**, porque hasta la Tarea 2 `genero` era
   texto libre en español: `PatientRow.tsx:23` y `PatientDetail.tsx:34` muestran `'M'`, y los dos
   pintan el color del estado con un ternario hardcodeado (`PatientRow.tsx:26`,
   `PatientDetail.tsx:27`) que ahora duplica `ESTADO_PACIENTE_META[…].color`. Se usan
   `generoLabel(…, t)` y `estadoPacienteLabel(…, t)`, y el color sale del META: el ternario se va.

**Interfaces:**
- Consumes: `listPacientes`, `insertPaciente`, `updatePaciente` de `@/shared/data/pacientes`;
  `generoLabel`, `estadoPacienteLabel`, `GENEROS`, `ESTADOS_PACIENTE` de `../constants`.
- Produces: `usePacientes()` → `{ pacientes, loading, addPaciente, editPaciente, recargar }`.

- [ ] **Step 1: Escribir el hook**

Crear `src/features/medical/hooks/usePacientes.ts`:

```ts
import { useState, useEffect, useCallback } from 'react'
import { listPacientes, insertPaciente, updatePaciente } from '@/shared/data/pacientes'
import type { Paciente } from '../types'

export function usePacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  const recargar = useCallback(async () => {
    setLoading(true)
    try { setPacientes(await listPacientes()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const addPaciente = useCallback(async (data: Partial<Paciente>) => {
    const { data: row, error } = await insertPaciente(data)
    if (error) return { error }
    setPacientes(p => [...p, row as Paciente])
    return { data: row as Paciente }
  }, [])

  const editPaciente = useCallback(async (id: string, data: Partial<Paciente>) => {
    const { data: row, error } = await updatePaciente(id, data)
    if (error) return { error }
    setPacientes(p => p.map(x => (x.id === id ? (row as Paciente) : x)))
    return { data: row as Paciente }
  }, [])

  return { pacientes, loading, addPaciente, editPaciente, recargar }
}
```

- [ ] **Step 2: Sacar los pacientes del demo**

En `src/features/medical/hooks/useMedicalData.ts`: borrar `pacientes` del `useState` y del
`useEffect` que copia `demo.pacientes`, e importar `usePacientes()` en su lugar. **Citas, logs,
incidentes y capacitaciones siguen viniendo del demo** — no tocarlos.

- [ ] **Step 3: Arreglar los selects del modal**

En `PacienteModal.tsx`, los dos `<select>` pasan a usar los catálogos con etiqueta traducida y
**placeholder vacío** (regla de selects obligatorios):

```tsx
<select value={form.genero ?? ''} onChange={e => setForm(p => ({ ...p, genero: e.target.value as Genero }))} style={inputStyle}>
  <option value="">{t('med.select')}</option>
  {GENEROS.map(g => <option key={g} value={g}>{generoLabel(g, t)}</option>)}
</select>
```

`estado` se agrega igual, con `ESTADOS_PACIENTE` — hoy el formulario no lo ofrece y la columna es
`NOT NULL DEFAULT 'activo'`.

- [ ] **Step 4: Traducir el género en la tabla**

En `PatientRow.tsx`, donde se pinta `paciente.genero` o `paciente.estado`, envolver con
`generoLabel(…, t)` / `estadoPacienteLabel(…, t)`.

- [ ] **Step 5: Verificar**

```bash
pnpm typecheck && pnpm test
```

- [ ] **Step 6: Probarlo en el navegador**

Con `pnpm dev` levantado, entrar a `/medical` → Pacientes. Esperado:
- La lista arranca **vacía** (la tabla está vacía; es el aviso #1 del spec).
- "Nuevo paciente" con nombre y apellido guarda, y la fila aparece.
- **Recargar la página y que el paciente siga ahí.** Ese F5 es toda la fase.
- El dropdown de género arranca en el placeholder, no en "Masculino".

**Si el paciente no persiste, no seguir.** El resto del plan se apoya en esto.

- [ ] **Step 7: Commit**

```bash
git commit src/features/medical/hooks/usePacientes.ts \
  src/features/medical/hooks/useMedicalData.ts \
  src/features/medical/components/PacienteModal.tsx \
  src/features/medical/components/PatientRow.tsx \
  -m "feat(medical): los pacientes salen de la base, no del demo

Crear un paciente y recargar la página lo borraba. Citas, logs HIPAA,
incidentes y capacitaciones siguen siendo demo a propósito: esta fase es solo
pacientes. El select de género arranca en placeholder vacío — sin él el
navegador pinta la primera opción mientras el estado sigue en ''."
```

---

# FASE 2 — Los normalizadores

Funciones puras con su test. Nada de esto se ve todavía, y todo es lo que decide qué entra.

## Task 5: Normalizadores

**Files:**
- Create: `src/features/medical/utils/normalizers/index.ts`
- Create: `src/features/medical/utils/normalizers/index.test.ts`

**Interfaces:**
- Produces: `repararMojibake(s)`, `serialADate(v)`, `normalizarTelefono(v)`,
  `normalizarCaja(s)`, `normalizarGenero(v)`, `normalizarChart(v)`.
  Los que pueden fallar devuelven `{ valor, marcada, motivo }` — **nunca lanzan y nunca
  descartan en silencio.**

- [ ] **Step 1: Escribir el test que falla**

Crear `index.test.ts`. **Todos los casos salen del archivo real** (ver § Tests del spec):

```ts
import { describe, it, expect } from 'vitest'
import { repararMojibake, serialADate, normalizarTelefono, normalizarCaja, normalizarGenero, normalizarChart } from './index'

describe('repararMojibake', () => {
  it('repara el UTF-8 leído como latin-1', () => {
    expect(repararMojibake('PeÃ±a')).toBe('Peña')
    expect(repararMojibake('Bethsabe EstupiÃ±an')).toBe('Bethsabe Estupiñan')
  })
  it('deja intacto lo que ya está bien', () => {
    expect(repararMojibake('Peña')).toBe('Peña')
    expect(repararMojibake('Andrade')).toBe('Andrade')
  })
})

describe('serialADate', () => {
  it('convierte el serial de Excel a fecha local', () => {
    expect(serialADate('39872.0')).toEqual({ valor: '2009-02-28', marcada: false })
  })
  it('marca las fechas futuras en vez de aceptarlas', () => {
    // 61642 es 2068-10-06, una de las cuatro fechas futuras del archivo (error de
    // siglo al tipear). El serial va verificado: cualquier número futuro haría pasar
    // el test igual, así que uno equivocado mentiría sin que nada lo delate.
    expect(serialADate('61642')).toMatchObject({ marcada: true, motivo: 'futura' })
  })
  it('marca la celda vacía sin inventar una fecha', () => {
    expect(serialADate('')).toEqual({ valor: null, marcada: true, motivo: 'sinFecha' })
  })
})

describe('normalizarTelefono', () => {
  it('expande la notación científica y formatea 10 dígitos', () => {
    expect(normalizarTelefono('9.547060773E9')).toEqual({ valor: '(954) 706-0773', marcada: false })
  })
  it('saca el 1 de un 11 dígitos que empieza en 1', () => {
    expect(normalizarTelefono('1.7543678071E10')).toEqual({ valor: '(754) 367-8071', marcada: false })
  })
  it('MARCA los 11 dígitos que NO empiezan en 1 en vez de mutilarlos', () => {
    // 81370956960 es 813-709-5696 con un cero de más. Sacarle el primer dígito daría
    // 1370956960, un teléfono que no es de nadie: el default es marcar, no arreglar.
    expect(normalizarTelefono('8.137095696E10')).toMatchObject({ marcada: true })
    expect(normalizarTelefono('8.137095696E10').valor).not.toBe('(137) 095-6960')
  })
  it('marca los 9 dígitos, el 0.0 y el de 13', () => {
    expect(normalizarTelefono('7.868181E8')).toMatchObject({ marcada: true })
    expect(normalizarTelefono('0.0')).toMatchObject({ marcada: true })
    expect(normalizarTelefono('5.52199E12')).toMatchObject({ marcada: true })
  })
  it('la celda vacía no se marca: no informar un teléfono no es un error', () => {
    expect(normalizarTelefono('')).toEqual({ valor: null, marcada: false })
  })
})

describe('normalizarCaja', () => {
  it('pasa a Title Case respetando las partículas', () => {
    expect(normalizarCaja('GONZALEZ ESPONDA')).toBe('Gonzalez Esponda')
    expect(normalizarCaja('ardila de delgado')).toBe('Ardila de Delgado')
  })
})

describe('normalizarGenero', () => {
  it('resuelve los tres vocabularios contra el canónico', () => {
    expect(normalizarGenero('M')).toBe('M')
    expect(normalizarGenero('Male')).toBe('M')
    expect(normalizarGenero('Female')).toBe('F')
    expect(normalizarGenero('Femenino')).toBe('F')
  })
  it('devuelve null si no resuelve, para que el import lo pregunte', () => {
    expect(normalizarGenero('Masc.')).toBeNull()
  })
})

describe('normalizarChart', () => {
  it('el Chart# de Excel llega como float y va a entero', () => {
    // Es la CLAVE DE IDENTIDAD de eMedicalPractice: '2.0' y '2' tienen que dar lo mismo
    // o la misma persona entra dos veces.
    expect(normalizarChart('2.0')).toBe('2')
    expect(normalizarChart('1276.0')).toBe('1276')
    expect(normalizarChart('2')).toBe('2')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test -- normalizers`
Esperado: FAIL, no existe el módulo.

- [ ] **Step 3: Implementar**

Crear `index.ts`. Puntos que no se pueden improvisar:

- `serialADate` usa el epoch `1899-12-30` y construye la fecha **en hora local**
  (`localDate` de `@/shared/utils/dates`), nunca `toISOString().split('T')[0]`.
- `normalizarGenero` usa `resolveToCanonical` de `@/shared/utils/canonical` con los alias
  `{ male: 'M', female: 'F', masculino: 'M', femenino: 'F', m: 'M', f: 'F' }`.
- `repararMojibake` solo repara si el resultado es válido: en JS, `decodeURIComponent(escape(s))`
  dentro de un `try`, o `TextDecoder('utf-8')` sobre los bytes latin-1. Si tira, devolver el
  original.
- `normalizarTelefono`: expandir la notación científica con `Number(v)` y `Math.trunc`, quedarse
  con los dígitos, y **solo entonces** ramificar por longitud.

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pnpm test -- normalizers`
Esperado: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/medical/utils/normalizers/
git commit src/features/medical/utils/normalizers/ \
  -m "feat(medical): normalizadores del registro de pacientes, con sus tests

Los casos salen del archivo real, no inventados. El que más importa es el
teléfono: la regla obvia -11 dígitos, sacar el primero- inventa números
inválidos, porque tres de los cuatro de 11 dígitos son un número válido con un
cero de más al final. El default es marcar la fila, no arreglarla."
```

---

# FASE 3 — La identidad

El cerebro del import. Todo función pura, todo con test.

## Task 6: Parseo del nombre y clave de origen

**Files:**
- Create: `src/features/medical/utils/pacienteIdentity/index.ts`
- Create: `src/features/medical/utils/pacienteIdentity/index.test.ts`

**Interfaces:**
- Consumes: `repararMojibake`, `normalizarCaja`, `normalizarChart` de `../normalizers`.
- Produces:
  ```ts
  // eMedicalPractice trae First/Last en columnas separadas: meterle un separador en el
  // medio inventaría un formato que el archivo no tiene, y esa cadena inventada
  // terminaría dentro de la clave de identidad.
  type Crudo = string | { first: string; last: string }
  parseNombre(fuente: FuentePaciente, crudo: Crudo): { nombre: string; apellido: string; nota: string | null; ambiguo: boolean }
  claveOrigen(fuente: FuentePaciente, fila: { nombreCrudo?: string; dobCrudo?: string; chart?: string; fila?: number }): string
  nucleo(nombre: string, apellido: string): string[]   // multiconjunto ordenado, tokens de ≥2 letras
  ```

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect } from 'vitest'
import { parseNombre, claveOrigen, nucleo } from './index'

describe('parseNombre', () => {
  it('eClinicalWorks: APELLIDO,NOMBRE', () => {
    expect(parseNombre('ecw', 'ACEBEY,JONATHAN'))
      .toMatchObject({ nombre: 'Jonathan', apellido: 'Acebey', ambiguo: false })
  })

  it('eClinPro con separador: Nombre - Apellido', () => {
    expect(parseNombre('eclinpro', 'Javier - Andrade'))
      .toMatchObject({ nombre: 'Javier', apellido: 'Andrade', ambiguo: false })
  })

  it('eClinPro sin separador: la INICIAL va al nombre, no al apellido', () => {
    // 312 de las 416 filas sin separador tienen la inicial del segundo nombre en
    // segunda posición. Mandarla al apellido rompe los DOS niveles de matcheo y
    // duplica 149 personas en silencio.
    expect(parseNombre('eclinpro', 'SANDRA V NEGRETE'))
      .toMatchObject({ nombre: 'Sandra V', apellido: 'Negrete', ambiguo: false })
    expect(parseNombre('eclinpro', 'Katia D Triana Perez'))
      .toMatchObject({ nombre: 'Katia D', apellido: 'Triana Perez' })
  })

  it('eClinPro sin separador y sin inicial: ambiguo, no se adivina', () => {
    expect(parseNombre('eclinpro', 'Maria Elena Aranguren'))
      .toMatchObject({ ambiguo: true })
  })

  it('la anotación se saca ANTES de partir, y va a nota', () => {
    // 8 de las 157 anotadas no tienen separador: sin limpiar primero, DUPLICADO
    // ROCHE termina adentro del apellido y la fusión lo promueve como "más completo".
    expect(parseNombre('eclinpro', 'Rodrigo E Betancourt Alvarez DUPLICADO ROCHE'))
      .toMatchObject({ nombre: 'Rodrigo E', apellido: 'Betancourt Alvarez', nota: 'DUPLICADO ROCHE' })
  })

  it('repara el mojibake antes de todo', () => {
    // emed recibe las dos columnas, no una cadena con separador.
    expect(parseNombre('emed', { first: 'Yenni', last: 'PeÃ±a' }))
      .toMatchObject({ nombre: 'Yenni', apellido: 'Peña' })
  })

  it('normaliza la caja', () => {
    expect(parseNombre('ecw', 'GONZALEZ ESPONDA,MARIA')).toMatchObject({ apellido: 'Gonzalez Esponda' })
  })
})

describe('claveOrigen', () => {
  it('eMed usa el Chart# a entero', () => {
    expect(claveOrigen('emed', { chart: '2.0' })).toBe('2')
  })

  it('ecw/eclinpro usan el nombre CRUDO y el DOB CRUDO', () => {
    // Crudo, no interpretado: si saliera del nombre partido o de la fecha resuelta,
    // corregir una de las dos en el paso 4 haría que el import siguiente no
    // reconozca la fila y la duplique.
    expect(claveOrigen('eclinpro', { nombreCrudo: 'Javier - Andrade', dobCrudo: '27958.0' }))
      .toBe('javier andrade|27958.0')
  })

  it('el mojibake NO cambia la clave', () => {
    expect(claveOrigen('emed', { nombreCrudo: 'PeÃ±a', dobCrudo: '1' }))
      .toBe(claveOrigen('emed', { nombreCrudo: 'Peña', dobCrudo: '1' }))
  })

  it('sin DOB, la clave lleva el índice de fila', () => {
    // maitte ponce y teresa cabrera aparecen dos veces sin fecha: sin el índice
    // colapsan en un solo paciente y el resumen miente.
    const a = claveOrigen('eclinpro', { nombreCrudo: 'Maitte - Ponce', dobCrudo: '', fila: 12 })
    const b = claveOrigen('eclinpro', { nombreCrudo: 'Maitte - Ponce', dobCrudo: '', fila: 87 })
    expect(a).not.toBe(b)
  })
})

describe('nucleo', () => {
  it('descarta las iniciales y ordena', () => {
    expect(nucleo('Rosa F', 'Martinez Amaro')).toEqual(['amaro', 'martinez', 'rosa'])
    expect(nucleo('Rosa Francisca', 'Martinez Amaro')).toEqual(['amaro', 'francisca', 'martinez', 'rosa'])
  })

  it('es MULTIconjunto: conserva el token repetido', () => {
    // Con conjuntos, Hernandez Hernandez == Hernandez y se fusionaban pre-marcados.
    expect(nucleo('Raul', 'Hernandez Hernandez')).toEqual(['hernandez', 'hernandez', 'raul'])
    expect(nucleo('Raul', 'Hernandez')).toEqual(['hernandez', 'raul'])
  })

  it('no distingue en qué campo cayó cada parte', () => {
    expect(nucleo('Martinez', 'Aida')).toEqual(nucleo('Aida', 'Martinez'))
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test -- pacienteIdentity`

- [ ] **Step 3: Implementar**

`nucleo` = tokens de `nombre + apellido`, sin acentos, minúsculas, **filtrados a `length >= 2`**,
ordenados, **sin deduplicar**.

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pnpm test -- pacienteIdentity`
Esperado: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/medical/utils/pacienteIdentity/
git commit src/features/medical/utils/pacienteIdentity/ \
  -m "feat(medical): parseo de nombre por fuente y clave de origen

La regla de las iniciales es la corrección que más importa: 312 de las 416
filas de eClinPro sin separador llevan la inicial del segundo nombre, y
mandarla al apellido rompía los dos niveles de matcheo a la vez -149 personas
entraban duplicadas sin que nadie preguntara-. La clave sale del dato crudo
para que corregir el parseo no rompa la idempotencia."
```

---

## Task 7: Matcheo y fusión

**Files:**
- Modify: `src/features/medical/utils/pacienteIdentity/index.ts`
- Modify: `src/features/medical/utils/pacienteIdentity/index.test.ts`

**Interfaces:**
- Consumes: `nucleo`, `parseNombre` de este mismo módulo.
- Produces:
  ```ts
  // Las dos funciones piden lo MÍNIMO que necesitan, no un Paciente entero.
  export type Identificable = Pick<Paciente,
    'id' | 'nombre' | 'apellido' | 'fecha_nacimiento' | 'telefono' | 'email'>

  export function candidatos(
    fila: Omit<Identificable, 'id'>,
    pacientes: readonly Identificable[],
  ): { nivel: 'exacta' | 'parcial'; paciente: Identificable }[]

  export function fusionar(
    existente: Partial<Paciente>,
    entrante: Partial<Paciente>,
  ): { paciente: Partial<Paciente>; choques: string[] }
  ```

**Por qué `Pick` y `Partial` y no `Paciente`.** `Paciente` tiene 18 propiedades y **todas son
requeridas** — las nullables son `T | null`, no opcionales. Con la firma pidiendo `Paciente`, cada
fixture de test necesitaría doce campos de relleno (`mrn`, `created_at`, `seguro_id`…) que la
función ni mira, o un `as Paciente` para callar al compilador — y el `as` está prohibido por
`codigo.md`, que manda salir por `Pick`/`Omit`/`Partial` exactamente en este caso.

Además es mejor contrato: `candidatos` compara nombre, fecha y contacto, así que **eso** es lo que
tiene que pedir. Los fixtures de los tests de abajo tipan tal cual están escritos.

**Regla de contacto disjunto — la definición precisa**, porque de acá salen los dos tests de
"ausente ≠ disjunto": una coincidencia exacta baja a parcial **solo si** `telefono` y `email`
tienen valor **en los dos lados** y **ninguno de los dos coincide**. Si de un lado falta el dato,
no hay evidencia de que sean personas distintas, y la coincidencia se queda en exacta.

- [ ] **Step 1: Escribir el test que falla**

```ts
describe('candidatos', () => {
  const rosa = { id: '1', nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: '1964-09-13', telefono: '(305) 555-0101', email: 'r@x.com' }

  it('exacta: mismo núcleo y mismo DOB', () => {
    const f = { nombre: 'Ardila de Delgado', apellido: 'Rosa Elvira', fecha_nacimiento: '1964-09-13' }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'exacta' })
  })

  it('parcial: el núcleo corto está contenido en el largo', () => {
    const f = { nombre: 'Rosa', apellido: 'Ardila', fecha_nacimiento: '1964-09-13' }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'parcial' })
  })

  it('el apellido repetido NO es exacta', () => {
    const raul = { id: '2', nombre: 'Raul', apellido: 'Hernandez', fecha_nacimiento: '1970-01-01' }
    const f = { nombre: 'Raul', apellido: 'Hernandez Hernandez', fecha_nacimiento: '1970-01-01' }
    expect(candidatos(f, [raul])[0]).toMatchObject({ nivel: 'parcial' })
  })

  it('una exacta con teléfono Y email disjuntos baja a parcial', () => {
    const f = { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: '1964-09-13',
                telefono: '(786) 555-9999', email: 'otra@y.com' }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'parcial' })
  })

  it('AUSENTE no es disjunto: sin contacto, la exacta sigue siendo exacta', () => {
    // El 86% de eClinPro no trae email. Si "sin dato" contara como disjunto, casi
    // ninguna de las 805 exactas quedaría pre-marcada y volverían a ser trabajo
    // manual — justo lo que los dos niveles existen para evitar.
    const f = { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: '1964-09-13',
                telefono: null, email: null }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'exacta' })
  })

  it('un solo dato de contacto coincidente alcanza para seguir siendo exacta', () => {
    const f = { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: '1964-09-13',
                telefono: '(305) 555-0101', email: 'otra@y.com' }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'exacta' })
  })

  it('los homónimos con distinto nombre NO son candidatos', () => {
    const laura = { id: '3', nombre: 'Laura', apellido: 'Garcia', fecha_nacimiento: '1989-01-09' }
    const f = { nombre: 'Lucia', apellido: 'Garcia', fecha_nacimiento: '1989-01-09' }
    expect(candidatos(f, [laura])).toEqual([])
  })

  it('sin DOB no hay candidatos', () => {
    const f = { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: null }
    expect(candidatos(f, [rosa])).toEqual([])
  })
})

describe('fusionar', () => {
  it('rellena los vacíos y no pisa lo que ya tiene valor', () => {
    const e = { nombre: 'Rosa', apellido: 'Ardila', telefono: '(305) 555-0101', email: null }
    const n = { nombre: 'Rosa', apellido: 'Ardila', telefono: '(786) 555-9999', email: 'r@x.com' }
    const { paciente, choques } = fusionar(e, n)
    expect(paciente.telefono).toBe('(305) 555-0101')
    expect(paciente.email).toBe('r@x.com')
    expect(choques).toContain('telefono')
  })

  it('el nombre gana si su núcleo contiene al otro', () => {
    const { paciente } = fusionar(
      { nombre: 'Rosa', apellido: 'Ardila' },
      { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado' })
    expect(paciente.apellido).toBe('Ardila de Delgado')
  })

  it('la inicial NO se duplica en los dos campos', () => {
    // Comparando nombre y apellido por separado salía "Maria F" / "F Candia".
    const { paciente } = fusionar(
      { nombre: 'Maria F', apellido: 'Candia' },
      { nombre: 'Maria',   apellido: 'F Candia' })
    expect(paciente.apellido).toBe('Candia')
  })

  it('sin relación de subconjunto gana el existente y se lista el choque', () => {
    const { paciente, choques } = fusionar(
      { nombre: 'Isabella', apellido: 'Castillo Araiz' },
      { nombre: 'Isabella', apellido: 'Castillo Arauz' })
    expect(paciente.apellido).toBe('Castillo Araiz')
    expect(choques).toContain('apellido')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test -- pacienteIdentity`

- [ ] **Step 3: Implementar**

`fusionar` resuelve el nombre como **una sola partición**: compara `nucleo(entrante)` contra
`nucleo(existente)` una vez, y si uno contiene al otro adopta **los dos campos** del más completo.
No comparar `nombre` y `apellido` por separado.

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pnpm test -- pacienteIdentity`
Esperado: PASS, 23 tests en total del módulo.

- [ ] **Step 5: Commit**

```bash
git commit src/features/medical/utils/pacienteIdentity/ \
  -m "feat(medical): matcheo en dos niveles y fusión de pacientes

Multiconjunto y no conjunto: con conjuntos, Hernandez Hernandez y Hernandez
eran iguales y se fusionaban pre-marcados, y después la fusión promovía el
apellido duplicado contra el voto de 2 de 3 fuentes.

El nombre se resuelve como UNA partición: comparando los dos campos por
separado, cada lado promovía su más largo y la inicial terminaba en los dos
('Maria F' / 'F Candia').

Una exacta con teléfono Y email disjuntos baja a parcial: son los 4 grupos
donde la única evidencia de identidad es el nombre y la fecha."
```

---

# FASE 4 — El import compartido

## Task 8: Leer .xlsx

**Files:**
- Modify: `package.json`
- Create: `src/shared/import/parseWorkbook/index.ts`
- Create: `src/shared/import/parseWorkbook/index.test.ts`

**Interfaces:**
- Produces: `parseWorkbook(buf: ArrayBuffer): Promise<{ hojas: string[] }>`;
  `readSheet(buf, hoja): Promise<{ headers: string[]; rows: string[][] }>`.
  **Asíncronas** porque la librería se importa de forma dinámica (ver Step 1b).
  **Todas las celdas salen como string crudo**, sin convertir fechas ni números: la conversión es
  de los normalizadores, y la clave de origen depende del crudo.

- [ ] **Step 1: Agregar la dependencia**

```bash
pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
pnpm audit
```

**La decisión ya está tomada; esto no se reevalúa.** Verificado el 21/08/2026:

| Origen | Versión | Por qué no |
|---|---|---|
| `pnpm add xlsx` (npm) | **0.18.5**, congelada | SheetJS dejó de publicar en npm después de esa versión. Es la rama vieja |
| `pnpm add @e965/xlsx` (npm) | 0.20.3 | Un tercero republicando código ajeno. Confiar en un mantenedor que no podemos identificar, para la librería que **parsea archivos con datos de pacientes**, es peor que el problema que resuelve |
| **cdn.sheetjs.com** (tarball) | **0.20.3** | ✅ Canal oficial del mantenedor. `pnpm` guarda el hash de integridad en el lockfile, así que las instalaciones siguientes quedan verificadas |

El CDN responde `200` y pesa 2,4 MB. **Costo de esta decisión:** el build necesita alcanzar
`cdn.sheetjs.com`, no solo el registry de npm. Si algún día el CI no puede, la salida es
vendorizar el tarball, no volver a la 0.18.5.

- [ ] **Step 1b: Importar la librería de forma dinámica**

2,4 MB no pueden entrar al bundle principal por una pantalla que se usa una vez por mes. La
importación va **adentro de la función que la usa**, no en el tope del archivo:

```ts
export async function parseWorkbook(buf: ArrayBuffer) {
  const XLSX = await import('xlsx')   // ← code-split: sale del bundle principal
  …
}
```

Esto vuelve `parseWorkbook` y `readSheet` asíncronas. Los tests las esperan con `await`, y el
modal ya trabaja con promesas (hoy hace `await file.text()`).

- [ ] **Step 2: Escribir el test que falla**

El test construye un workbook en memoria con la propia librería y lo lee de vuelta — no depende
del archivo real, que tiene PHI y no va al repo:

```ts
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseWorkbook, readSheet } from './index'

function libroDePrueba(): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Patient Name', 'DOB'], ['ACEBEY,JONATHAN', 39872],
  ]), 'eClinicalWorks')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Name', 'DOB'], ['Javier - Andrade', 27958],
  ]), 'eClinPro')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('parseWorkbook', () => {
  it('lista las hojas en orden', async () => {
    expect((await parseWorkbook(libroDePrueba())).hojas).toEqual(['eClinicalWorks', 'eClinPro'])
  })
})

describe('readSheet', () => {
  it('devuelve headers y filas de la hoja pedida', async () => {
    const { headers, rows } = await readSheet(libroDePrueba(), 'eClinPro')
    expect(headers).toEqual(['Name', 'DOB'])
    expect(rows[0][0]).toBe('Javier - Andrade')
  })

  it('la fecha sale CRUDA como serial, no convertida', async () => {
    // Si SheetJS la devolviera como Date, la clave de origen cambiaría de formato
    // y el import dejaría de reconocer las filas ya cargadas.
    const { rows } = await readSheet(libroDePrueba(), 'eClinicalWorks')
    expect(rows[0][1]).toBe('39872')
  })
})
```

- [ ] **Step 3: Correr y verificar que falla**

Run: `pnpm test -- parseWorkbook`

- [ ] **Step 4: Implementar**

Usar `XLSX.read(buf, { type: 'array', cellDates: false, raw: true })` y
`XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: '' })`. **`cellDates: false` no es
opcional**: con `true` las fechas vuelven como `Date` y la clave de origen cambia de formato.

- [ ] **Step 5: Correr y verificar que pasa**

Run: `pnpm test -- parseWorkbook`
Esperado: PASS, 3 tests. **Si el tercero falla, es el supuesto sobre SheetJS que el spec marcó
como NO VERIFICADO** — ajustar las opciones hasta que la fecha salga cruda, y actualizar el spec.

- [ ] **Step 6: Commit**

```bash
git add src/shared/import/parseWorkbook/ package.json pnpm-lock.yaml
git commit src/shared/import/parseWorkbook/ package.json pnpm-lock.yaml \
  -m "feat(shared): lector de .xlsx con selección de hoja

Todas las celdas salen como string crudo, incluidas las fechas: la clave de
identidad del import se calcula sobre el crudo, así que si SheetJS convirtiera
los seriales a Date la clave cambiaría de formato y dejaría de reconocer lo ya
cargado."
```

---

## Task 9: Promover el plan de import a `src/shared/`

**Files:**
- Create: `src/shared/import/identity.ts`
- Create: `src/shared/import/buildImportPlan/index.ts`
- Create: `src/shared/import/buildImportPlan/index.test.ts`
- Modify: `src/features/research/utils/importPlan.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Identity<Row> = {
    claveOrigen: (fila: string[], i: number) => string
    existente: (clave: string) => string | undefined
    candidatos: (fila: Row, i: number) => { nivel: 'exacta' | 'parcial'; id: string }[]
  }
  export function buildImportPlan<Row>(input: {
    rows: string[][]; mapping: (string | null)[]; identity: Identity<Row>
    coerce: (col: string, v: string) => unknown
  }): ImportPlan
  ```
- `ImportPlan` = `{ toInsert, toUpdate, toMerge, repetidas, tumbas, skipped }`.

**`Identity` es un adaptador, no las funciones de Medical directamente.** Las de la Tarea 6
reciben un objeto (`{ nombreCrudo, dobCrudo, chart, fila }`) y las de la Tarea 7 devuelven el
paciente entero; el contrato compartido habla de `fila: string[]` e `id`. Quien traduce es el
adaptador que Medical arma en la Tarea 10, que es donde está el `mapping` que dice qué columna
del archivo es cuál. **`src/shared/import/` no conoce ninguna de las dos formas de Medical.**

Los campos agregados (`toMerge`, `repetidas`, `tumbas`) no rompen los tests de Research:
verificado que `importPlan.test.ts` asierta por campo (`p.toInsert`, `p.skipped`), nunca la
forma entera del objeto.

- [ ] **Step 1: Escribir el test que falla**

Cubrir, como mínimo:
- Una fila cuya `(fuente, clave)` ya existe → va a `toUpdate`, **no** genera candidatos.
- Dos filas con la misma `clave_origen` → una sola en `toInsert`, `repetidas: 1`.
- Una fila cuya clave existe con `paciente_id: null` → va a `tumbas`, no se recrea.
- Una fila con candidato exacto → `toMerge` con `preMarcado: true`.
- Una fila con candidato parcial → `toMerge` con `preMarcado: false`.

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test -- buildImportPlan`

- [ ] **Step 3: Implementar**

Partir de `src/features/research/utils/importPlan.ts` y **sacarle el dominio**: `normNct`,
`DEFAULT_STAGE` y `COUNT_COLUMN` salen del archivo y entran por `identity` y `coerce`. El
resultado no importa nada de `src/features/`.

- [ ] **Step 4: Hacer que Research delegue**

`src/features/research/utils/importPlan.ts` conserva su API pública (`guessMapping`,
`indexByNct`, `buildImportPlan`, `planCounterChanges`, `stripCounterFor`, `ignoredHeaders`) pero
`buildImportPlan` pasa a llamar al compartido con la identidad por NCT#.

- [ ] **Step 5: Verificar que Research no se rompió**

Run: `pnpm test -- importPlan`
Esperado: **los tests existentes de Research pasan sin tocarlos.** Si hay que editarlos, la
promoción cambió el comportamiento y está mal.

- [ ] **Step 6: Commit**

```bash
git add src/shared/import/identity.ts src/shared/import/buildImportPlan/
git commit src/shared/import/identity.ts src/shared/import/buildImportPlan/ \
  src/features/research/utils/importPlan.ts \
  -m "refactor(shared): el plan de import sube a shared con la identidad como parámetro

Research lo resolvía por NCT#; Medical necesita nombre+DOB en dos niveles. Lo
que cambia entre módulos es la identidad, así que entra por prop: el
compartido no importa nada de features/. Los tests de Research pasan sin
tocarse, que es la prueba de que la promoción no cambió el comportamiento."
```

---

# FASE 5 — El modal

## Task 10: El modal de 6 pasos

**Files:**
- Create: `src/shared/import/ImportModal/index.tsx` + `index.module.css`
- Create: `src/shared/import/SheetPicker/`, `SanitizeRow/`, `MergeCandidateRow/`
- Delete: `src/features/research/components/leads/ImportModal.tsx`
- Modify: `src/shared/i18n/locales/es.json`, `en.json`

- [ ] **Step 1: Mover el modal y pasarlo a CSS Modules**

El actual es todo `style={{}}` contra `RESEARCH_THEME`. En compartido no puede importar el tema de
Research: los valores van a `index.module.css` usando los tokens de `src/app/globals.css`
(`--s1`, `--s2`, `--t1`, `--accent`). Lo único que puede quedar en un `style` es un **dato** pasado
como variable CSS.

- [ ] **Step 2: Extraer las filas del `.map()` a sus componentes**

`SheetPicker`, `SanitizeRow` y `MergeCandidateRow`, cada uno su carpeta con su
`index.module.css`. Ningún bloque de markup dentro de un `.map()` queda inline.

- [ ] **Step 3: Agregar los pasos 2 (hoja) y 4 (saneamiento)**

El selector de hoja **solo se renderiza si `hojas.length > 1`**. El saneamiento lista las filas
marcadas por los normalizadores con el valor crudo al lado del interpretado, editable o excluible.

- [ ] **Step 4: El paso 5, en dos listas**

Arriba las exactas, pre-marcadas, con contador y "desmarcar todas". Abajo las parciales, **sin
marcar**, con las dos filas enfrentadas.

- [ ] **Step 5: El resumen del paso 6, por categoría**

Nuevas · fusionadas · actualizadas · repetidas en el archivo · excluidas a mano · de pacientes
eliminados. **Nada se descarta sin aparecer en una de esas líneas.**

- [ ] **Step 6: Verificar**

```bash
pnpm typecheck && pnpm test && pnpm build:check
```

- [ ] **Step 7: Probarlo en el navegador con un recorte inventado**

**No usar el archivo real**: es PHI y va solo a producción. Armar un .xlsx de prueba con las
anomalías —los tres formatos de nombre, un mojibake, una inicial sin separador, un serial, un
teléfono de 11 dígitos sin prefijo 1, un duplicado exacto y uno parcial— e importarlo en
`/medical`.

Verificar: el selector de hoja aparece; el saneamiento marca las anomalías; las exactas vienen
pre-marcadas y las parciales no; el resumen cuadra; **y reimportar el mismo archivo da 0 nuevos y
0 preguntas.**

- [ ] **Step 8: Verificar que Research sigue importando**

Abrir `/research` → import y subir un CSV de leads. Es el módulo que ya estaba en producción: si
esto se rompió, la promoción salió mal.

- [ ] **Step 9: Commit**

---

## Task 11: Escritura por lotes

**Files:**
- Modify: `src/features/medical/hooks/usePacientes.ts`
- Create: `src/features/medical/utils/escribirImport.ts` + su test

- [ ] **Step 1: Escribir el test del troceo**

Función pura `lotes(rows, 500)`: 1.200 filas → 3 lotes de 500/500/200. El id de cada paciente se
genera **antes** de escribir, con `crypto.randomUUID()`, y viaja en el payload.

- [ ] **Step 2: Implementar la escritura**

Orden: `upsertPacientes` primero, `upsertPacienteFuentes` después con los **mismos ids que ya
están en el payload** — nunca leerlos del `RETURNING`. Cada objeto del lote lleva **todas** las
columnas con `null` explícito (PostgREST exige el mismo conjunto de claves en todo el array).

- [ ] **Step 3: Probar el reintento**

Con el dev server levantado: importar el recorte, cortar la red a mitad (DevTools → Offline),
volver a habilitarla y reintentar. Esperado: **no se duplica nada** y el conteo final cuadra.

- [ ] **Step 4: Commit**

---

## Task 12: Avisos y cierre

- [ ] **Step 1: Escribir los avisos en `.todo/TODO.md`**

Los cuatro de la sección "Avisos" del spec: la pestaña arranca vacía, las citas demo hablan de
gente que no está en la tabla, `GENEROS` cambia de valores canónicos, y los nombres se guardan en
Title Case.

- [ ] **Step 2: Verificación final**

```bash
pnpm typecheck && pnpm test && pnpm build:check
```

- [ ] **Step 3: El push a dev/prod NO va en este plan**

Es irreversible y tiene su propia checklist en el spec (§ Migración y despliegue), incluida la
verificación de los GRANT y del `db-max-rows`, y la regla de que **el archivo real se importa
únicamente en producción**. Se hace a mano, leyendo esa sección.

---

## Notas de la auto-revisión

Repasado contra el spec. Tres cosas que quedan explícitas para que nadie las descubra tarde:

1. **`SEGUROS` no se toca.** El spec lo menciona al pasar; la columna `seguro` sigue siendo texto
   libre y la constante sigue como está. Si se quiere catálogo, es otro trabajo.
2. **`PACIENTE_FIELD_DEFS`** aparece en la estructura de archivos del spec y **no tiene tarea
   propia**: se crea dentro de la Tarea 10, porque su única consumidora es la pantalla de mapeo del
   modal y escribirlo antes sería adivinar qué necesita.
3. **Los tests de componentes no existen** y no es un olvido: vitest corre sin DOM en este repo.
   Todo lo verificable está en funciones puras; lo visual se verifica en el navegador, y el plan
   dice en qué pasos.

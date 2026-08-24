# Contactos multivaluados — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar tarea por tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** Que un teléfono o un email nunca se pierdan al fusionar dos registros de paciente, y que cuando dos fuentes se contradigan quede escrito qué dijo cada una.

**Architecture:** Una tabla `paciente_contactos` acumula todo valor de contacto visto, con su procedencia; `pacientes.telefono`/`email` quedan como principal para listas y búsqueda. Lo contradictorio (fecha de nacimiento) no va a esa tabla —una persona nació un solo día— sino a `paciente_fuentes.dob_origen`. El motor de import compartido aprende que un campo puede acumular varias columnas del archivo.

**Tech Stack:** Next.js 14 + TypeScript, Supabase (Postgres 17), vitest (sin DOM: no hay jsdom ni testing-library).

**Spec:** `docs/superpowers/specs/2026-08-23-contactos-multivaluados-design.md`

## Global Constraints

- **Prohibido `any`** (ESLint `no-explicit-any: error`). Salida: `Pick`/`Omit`/`Partial`/`unknown` con narrowing.
- **`tsconfig.json` tiene `"strict": false`** — sin `strictNullChecks`. **No discriminar una unión comparando contra `null`**: usar un discriminante de texto. Ya mordió antes en este proyecto.
- **`src/shared/` no puede importar `src/features/`.** Todo el dominio entra por props/parámetros.
- **Imports:** nada de `../../`; `@/shared/...` o `@/features/<modulo>/...`. `src/shared/*` se importa por su barrel.
- **Cero `style={{}}`** salvo un dato pasado como variable CSS.
- **i18n en `es.json` Y `en.json`.** Ningún texto de usuario inline, ni en mensajes de error/éxito. Nada de `i18n-ignore`.
- **Fechas de calendario con `localDate()`/`localMonth()`** de `@/shared/utils`. Nunca `toISOString().split('T')[0]`.
- **Verificación:** `pnpm typecheck && pnpm test && pnpm build:check`. **Nunca `next build` a secas** — comparte `.next/` con el dev server y lo deja sirviendo 503 en sus propios chunks.
- **Commits por ruta:** `git add <rutas>` y después `git commit <las mismas rutas> -m "..."`. Nada de `git add -A` ni `git commit` sin rutas.
- **El archivo real (`/home/wagner/Descargas/EMC/...`) es PHI.** Solo se usa en la Tarea 11 y **nunca** se imprimen valores: conteos y agregados.
- **Research está en producción** y usa el mismo `ImportModal`/`buildImportPlan`. Su comportamiento no puede cambiar salvo donde el spec lo declara (el aviso de colisión, Tarea 3).

## Estado de la base local — leer antes de la Tarea 1

Local **no** está vacía: **287 pacientes, 284 `paciente_fuentes` de `ecw`, 42 filas con `telefono_alt` cargado**, de una prueba manual de import. Consecuencias:

- El `supabase/rollback/predump-*` que existe se tomó con **3** pacientes. **Correr `deshacer-import-local.sh` con ese dump borra los 287.** Tomar uno nuevo antes de tocar nada (Tarea 1, paso 1).
- La Tarea 8 (`DROP COLUMN telefono_alt`) se lleva esos 42 valores. Es aceptable —son datos de prueba y se reconstruyen reimportando la hoja— pero se hace **a propósito y en ese orden**.

## Estructura de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `supabase/migrations/<ts>_paciente_contactos.sql` | `DOMAIN tipo_contacto`, tabla + RLS/GRANT, `dob_origen` | 1 |
| `supabase/migrations/<ts>_drop_telefono_alt.sql` | `DROP COLUMN IF EXISTS telefono_alt` | 8 |
| `src/features/medical/types.ts` | `PacienteContacto`; `dob_origen`; sacar `telefono_alt` | 1, 8 |
| `src/features/medical/data/pacientes.ts` | listar y upsertear contactos | 1 |
| `src/shared/import/ImportModal/index.tsx` | `ImportFieldDef.multi`; aviso de colisión | 2, 3 |
| `src/shared/import/buildImportPlan/index.ts` | acumular en vez de pisar | 2 |
| `src/features/medical/utils/pacienteFields/index.ts` | `multi: true`; `guessMapping` sin el hack | 4 |
| `src/features/medical/utils/pacienteImportPlan/index.ts` | los 4 `indexOf` → listas; contactos por fila | 4 |
| `src/features/medical/components/PacientesImportModal/index.tsx` | resolver el principal antes del paso 5 | 4 |
| `src/features/medical/utils/escribirImport/index.ts` | escribir contactos con dedup de lote; propagar `choques` | 5, 6 |
| `src/features/medical/utils/pacienteIdentity/index.ts` | contacto deja de ser choque; gate del DOB | 6, 7 |
| `src/features/medical/components/PacienteModal.tsx` | el alta manual acumula contactos | 9 |
| `src/features/medical/components/PacienteDetail*` | mostrar los contactos con su procedencia | 10 |

---

## Task 1: La migración y la capa de datos de contactos

**Files:**
- Create: `supabase/migrations/<timestamp>_paciente_contactos.sql`
- Modify: `src/features/medical/types.ts`
- Modify: `src/features/medical/data/pacientes.ts`
- Modify: `src/shared/data/tables.ts`

**Interfaces:**
- Produces: `PacienteContacto`, `listPacienteContactos()`, `upsertPacienteContactos(rows)`, `PacienteFuente.dob_origen`
- Consumes: nada

**Esta tarea NO borra `telefono_alt`.** Eso es la Tarea 8, cuando ya nada lo escriba. Acá el árbol tiene que seguir compilando igual que antes.

- [ ] **Step 1: Backup nuevo de la base local**

El predump que existe es de cuando había 3 pacientes. Tomar uno del estado real, **dentro del contenedor** (el `pg_dump` del host es v14 contra un servidor 17 y aborta con `server version mismatch`):

```bash
docker exec supabase_db_eminat-app pg_dump -U postgres -d postgres \
  -t public.pacientes -t public.paciente_fuentes --data-only \
  > supabase/rollback/predump-pacientes-local-$(date +%Y%m%d-%H%M%S).sql
docker exec supabase_db_eminat-app psql -U postgres -d postgres -tAc \
  "SELECT (SELECT count(*) FROM public.pacientes)||' pacientes, '||(SELECT last_value FROM public.pacientes_mrn_seq)||' seq'"
```

Anotar los dos números: son el estado a restaurar.

- [ ] **Step 2: Escribir la migración**

```bash
pnpm supabase migration new paciente_contactos
```

Contenido (idempotente de punta a punta, porque el workaround del historial desalineado de la CLI es aplicar el `.sql` por psql y puede correr dos veces):

```sql
-- Contactos multivaluados del paciente. Ver docs/superpowers/specs/2026-08-23-contactos-multivaluados-design.md
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_contacto') THEN
    CREATE DOMAIN public.tipo_contacto AS text
      CONSTRAINT tipo_contacto_valores CHECK (VALUE IN ('telefono','email'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.paciente_contactos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id  uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo         public.tipo_contacto NOT NULL,
  valor        text NOT NULL
    CONSTRAINT paciente_contactos_valor_no_vacio CHECK (btrim(valor) <> ''),
  fuente       public.fuente_paciente NOT NULL DEFAULT 'manual',
  clave_origen text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT paciente_contactos_unico UNIQUE (paciente_id, tipo, valor, fuente)
);

CREATE INDEX IF NOT EXISTS paciente_contactos_paciente_idx
  ON public.paciente_contactos (paciente_id);

-- Lo contradictorio NO va a la tabla de contactos: una persona nació un solo día. Se guarda
-- qué dijo cada sistema, en CRUDO -por eso `text` y no `date`: una fecha ilegible es justo el
-- caso que hay que poder investigar.
ALTER TABLE public.paciente_fuentes
  ADD COLUMN IF NOT EXISTS dob_origen text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paciente_contactos TO authenticated, service_role;

DO $$
DECLARE
  slug   text   := 'medical';
  tablas text[] := ARRAY['paciente_contactos'];
  tbl    text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo % sin ningún rol asignado: la tabla quedaría muda para todos menos el admin', slug;
  END IF;
  FOREACH tbl IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "mod_access" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "mod_access" ON public.%I USING ((SELECT public.has_module(%L)))', tbl, slug);
  END LOOP;
END $$;
```

- [ ] **Step 3: Aplicarla en local y verificar que es idempotente**

**Nunca `supabase db reset`** — `config.toml` apunta `sql_paths` a un `seed.sql` que no existe y el reset borra los datos sin vuelta.

```bash
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres \
  < supabase/migrations/<archivo>.sql
# otra vez: tiene que pasar sin error
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres \
  < supabase/migrations/<archivo>.sql
```

Esperado: las dos corridas terminan sin error, y:

```bash
docker exec supabase_db_eminat-app psql -U postgres -d postgres -tAc \
  "SELECT count(*) FROM public.paciente_contactos"   # 0
docker exec supabase_db_eminat-app psql -U postgres -d postgres -tAc \
  "SELECT column_name FROM information_schema.columns WHERE table_name='paciente_fuentes' AND column_name='dob_origen'"   # dob_origen
```

- [ ] **Step 4: Verificar que el `UNIQUE` deduplica también lo manual**

Es la corrección que motivó `fuente NOT NULL DEFAULT 'manual'`. Sin esto, no hay evidencia de que el arreglo funcione:

```bash
docker exec supabase_db_eminat-app psql -U postgres -d postgres -c "
WITH p AS (SELECT id FROM public.pacientes LIMIT 1)
INSERT INTO public.paciente_contactos (paciente_id, tipo, valor)
SELECT id, 'telefono', '3055550101' FROM p
ON CONFLICT ON CONSTRAINT paciente_contactos_unico DO NOTHING;
"
# correrlo DOS veces y después:
docker exec supabase_db_eminat-app psql -U postgres -d postgres -tAc \
  "SELECT count(*) FROM public.paciente_contactos WHERE valor='3055550101'"
```

Esperado: **1**, no 2. Limpiar después:

```bash
docker exec supabase_db_eminat-app psql -U postgres -d postgres -c \
  "DELETE FROM public.paciente_contactos WHERE valor='3055550101'"
```

- [ ] **Step 5: Los tipos**

En `src/features/medical/types.ts`, agregar (sin tocar `Paciente` todavía):

```ts
export interface PacienteContacto {
  id: string
  paciente_id: string
  tipo: 'telefono' | 'email'
  valor: string
  fuente: FuentePaciente
  clave_origen: string | null
  created_at: string
}
```

Y a `PacienteFuente`, después de `nombre_origen`:

```ts
  dob_origen: string | null
```

- [ ] **Step 6: La capa de datos**

En `src/shared/data/tables.ts`, agregar `pacienteContactos: 'paciente_contactos'` junto a las otras.

En `src/features/medical/data/pacientes.ts`:

```ts
export const listPacienteContactos = () =>
  listAllRows<PacienteContacto>(TABLES.pacienteContactos, 'created_at')

// `ignoreDuplicates: true` NO es un detalle: es lo que hace que el lote sobreviva. Genera
// `ON CONFLICT ... DO NOTHING`, que tolera dos filas idénticas en el MISMO comando. Con
// `DO UPDATE` (el default de supabase-js) el mismo lote aborta entero con
// `ON CONFLICT DO UPDATE command cannot affect row a second time` — verificado contra el
// Postgres local: DO NOTHING deja 1 fila sin error, DO UPDATE tira ERROR.
// Y es lo correcto además de lo seguro: un contacto no tiene nada que actualizar; existe o no.
export const upsertPacienteContactos = (rows: Omit<PacienteContacto, 'id' | 'created_at'>[]) =>
  supabase.from(TABLES.pacienteContactos)
    .upsert(rows, { onConflict: 'paciente_id,tipo,valor,fuente', ignoreDuplicates: true })
```

Agregar `PacienteContacto` al import de tipos del archivo.

- [ ] **Step 7: Verificar y commitear**

```bash
pnpm typecheck && pnpm test
```

Esperado: limpio, 339/339 (nada cambió de comportamiento).

```bash
git add supabase/migrations/<archivo>.sql
git commit supabase/migrations/<archivo>.sql src/features/medical/types.ts \
  src/features/medical/data/pacientes.ts src/shared/data/tables.ts \
  -m "feat(medical): tabla paciente_contactos y dob_origen

..."
```

---

## Task 2: El motor compartido aprende a acumular

**Files:**
- Modify: `src/shared/import/ImportModal/index.tsx` (el tipo `ImportFieldDef`)
- Modify: `src/shared/import/buildImportPlan/index.ts`
- Test: `src/shared/import/buildImportPlan/index.test.ts`

**Interfaces:**
- Consumes: nada de la Tarea 1
- Produces: `ImportFieldDef.multi?: boolean`; `buildImportPlan` acepta `multi?: readonly string[]`

**Research no puede cambiar.** Su wrapper llama a `buildImportPlan` sin `multi`, así que el default (ninguna columna acumula) tiene que reproducir exactamente el comportamiento de hoy.

- [ ] **Step 1: Escribir los tests que fallan**

En `src/shared/import/buildImportPlan/index.test.ts`, agregar:

```ts
describe('columnas multi', () => {
  const identityTrivial = {
    claveOrigen: (_f: string[], i: number) => `k${i}`,
    existente: () => undefined,
    candidatos: () => [],
  }
  const coerce = (_col: string, v: string) => (v === '' ? null : v)

  it('dos columnas al mismo campo multi acumulan en un array', () => {
    const plan = buildImportPlan({
      rows: [['305', '786']],
      mapping: ['telefono', 'telefono'],
      identity: identityTrivial,
      coerce,
      multi: ['telefono'],
    })
    expect(plan.toInsert[0].telefono).toEqual(['305', '786'])
  })

  it('el mismo valor en dos columnas multi no se duplica', () => {
    const plan = buildImportPlan({
      rows: [['305', '305']],
      mapping: ['telefono', 'telefono'],
      identity: identityTrivial,
      coerce,
      multi: ['telefono'],
    })
    expect(plan.toInsert[0].telefono).toEqual(['305'])
  })

  it('una celda vacía no entra al array', () => {
    const plan = buildImportPlan({
      rows: [['305', '']],
      mapping: ['telefono', 'telefono'],
      identity: identityTrivial,
      coerce,
      multi: ['telefono'],
    })
    expect(plan.toInsert[0].telefono).toEqual(['305'])
  })

  it('SIN multi el comportamiento es el de hoy: la ultima columna gana', () => {
    const plan = buildImportPlan({
      rows: [['305', '786']],
      mapping: ['telefono', 'telefono'],
      identity: identityTrivial,
      coerce,
    })
    expect(plan.toInsert[0].telefono).toBe('786')
  })

  it('una fila con solo un array vacio no cuenta como fila con datos', () => {
    const plan = buildImportPlan({
      rows: [['', '']],
      mapping: ['telefono', 'telefono'],
      identity: identityTrivial,
      coerce,
      multi: ['telefono'],
    })
    expect(plan.toInsert).toHaveLength(0)
  })
})
```

El último es el borde que se escapa fácil: hoy la fila se descarta con `if (!Object.values(values).some(v => v !== null)) return`, y un array vacío **no** es `null`, así que sin cuidado una fila entera vacía pasaría a contarse como fila con datos.

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
npx vitest run src/shared/import/buildImportPlan
```

Esperado: FAIL — `multi` no existe en el input.

- [ ] **Step 3: Implementar**

En `src/shared/import/buildImportPlan/index.ts`, agregar `multi` al input y reemplazar el armado de `values`:

```ts
export function buildImportPlan<Row extends string[] = string[]>(input: {
  rows: Row[]
  mapping: (string | null)[]
  identity: Identity<Row>
  coerce: (col: string, v: string) => unknown
  // Columnas que ACUMULAN varias columnas del archivo en vez de pisarse. Vacío por default:
  // sin esto, dos columnas mapeadas al mismo campo se pisaban y ganaba la última, en silencio.
  multi?: readonly string[]
}): ImportPlan {
  const { rows, mapping, identity, coerce, multi } = input
  const acumulan = new Set(multi ?? [])
```

Y adentro del `rows.forEach`:

```ts
    const values: Record<string, unknown> = {}
    mapping.forEach((col, idx) => {
      if (!col) return
      const v = coerce(col, (fila[idx] ?? '').trim())
      if (!acumulan.has(col)) { values[col] = v; return }
      const acc = (values[col] as unknown[] | undefined) ?? []
      if (v !== null && v !== '' && !acc.includes(v)) acc.push(v)
      values[col] = acc
    })
    // Una fila vacía no cuenta. Un array vacío tampoco tiene datos, aunque no sea `null`.
    const conDatos = Object.values(values).some((v) =>
      Array.isArray(v) ? v.length > 0 : v !== null)
    if (!conDatos) return
```

En `src/shared/import/ImportModal/index.tsx`, línea 27:

```ts
export type ImportFieldDef = { column: string; labelKey: I18nKey; multi?: boolean }
```

- [ ] **Step 4: Correr los tests**

```bash
npx vitest run src/shared/import src/features/research
```

Esperado: PASS, y **los tests de Research sin tocar**.

- [ ] **Step 5: Probar que los tests muerden**

Aplicar cada mutación, correr, revertir. Un test que pasa no prueba nada hasta que se lo vio fallar:

| Mutación | Test que TIENE que fallar |
|---|---|
| `if (!acc.includes(v))` → `if (true)` | "el mismo valor en dos columnas multi no se duplica" |
| `v !== '' &&` fuera | "una celda vacía no entra al array" |
| `Array.isArray(v) ? v.length > 0 : v !== null` → `v !== null` | "una fila con solo un array vacio..." |
| `acumulan.has(col)` → `false` | los tres primeros |

Reportar la evidencia literal. Si alguna mutación **no** hace fallar nada, ese test no sirve y hay que arreglarlo antes de seguir.

- [ ] **Step 6: Commit**

```bash
git commit src/shared/import/buildImportPlan/index.ts \
  src/shared/import/buildImportPlan/index.test.ts \
  src/shared/import/ImportModal/index.tsx \
  -m "feat(shared): un campo del import puede acumular varias columnas del archivo

..."
```

---

## Task 3: El aviso de colisión en un campo que no acumula

**Files:**
- Modify: `src/shared/import/ImportModal/index.tsx` + `index.module.css`
- Modify: `src/shared/i18n/locales/es.json`, `en.json`

**Interfaces:**
- Consumes: `ImportFieldDef.multi` (Tarea 2)
- Produces: nada que otra tarea use

La otra mitad del mismo bug: si dos columnas apuntan a un campo que **no** acumula, una se descarta sin decir nada. Es la regla del spec anterior —*nada se descarta sin aparecer en una de esas líneas*— rompiéndose hoy.

**Esto sí cambia Research**, y está declarado en el spec: un CSV cuyos alias legacy manden dos headers al mismo campo va a mostrar un aviso que hoy no existe. No lo bloquea.

- [ ] **Step 1: Las claves i18n, en los dos idiomas**

`es.json`:
```json
"import.collisionNote": "{cols} apuntan al mismo campo «{campo}». Solo se importa la última: las demás se descartan."
```
`en.json`:
```json
"import.collisionNote": "{cols} map to the same field \"{campo}\". Only the last one is imported; the rest are discarded."
```

- [ ] **Step 2: Calcular las colisiones**

En `ImportModal`, junto a los otros `useMemo`, **antes** de cualquier return condicional (Rules of Hooks — el archivo ya tiene un comentario explicando por qué):

```ts
// Dos columnas del archivo apuntando al MISMO campo no-multi: una se descarta. Un campo multi
// no colisiona, acumula (ver `buildImportPlan`).
const colisiones = useMemo(() => {
  const multiCols = new Set(fieldDefs.filter(f => f.multi).map(f => f.column))
  const porCampo = new Map<string, string[]>()
  mapping.forEach((col, i) => {
    if (!col || multiCols.has(col)) return
    if (!porCampo.has(col)) porCampo.set(col, [])
    porCampo.get(col)!.push(parsed.headers[i] ?? `#${i + 1}`)
  })
  return [...porCampo.entries()]
    .filter(([, cols]) => cols.length > 1)
    .map(([campo, cols]) => ({ campo, cols }))
}, [mapping, fieldDefs, parsed.headers])
```

- [ ] **Step 3: Renderizarlas**

Debajo de la sección de mapeo, con la misma clase de aviso que ya usa el saneamiento (`s.warnText`):

```tsx
{colisiones.map(c => (
  <div key={c.campo} className={s.warnText}>
    {t('import.collisionNote', {
      cols: c.cols.join(', '),
      campo: t(fieldDefs.find(f => f.column === c.campo)!.labelKey),
    })}
  </div>
))}
```

- [ ] **Step 4: Verificar**

```bash
pnpm typecheck && pnpm test
```

Y en el navegador: `/research` → Leads → Importar con un CSV que tenga dos columnas con el mismo nombre de campo. Tiene que aparecer el aviso y el import tiene que seguir funcionando.

**Si no se puede abrir el navegador, decirlo — no marcarlo como verificado.**

- [ ] **Step 5: Commit**

---

## Task 4: Medical acumula teléfonos, y todo lo que los lee se adapta

**Files:**
- Modify: `src/features/medical/utils/pacienteFields/index.ts`
- Modify: `src/features/medical/utils/pacienteImportPlan/index.ts`
- Modify: `src/features/medical/components/PacientesImportModal/index.tsx`
- Test: `src/features/medical/utils/pacienteImportPlan/index.test.ts`

**Interfaces:**
- Consumes: `buildImportPlan({ multi })` (Tarea 2)
- Produces: `values.telefono` y `values.email` como `string[]`; `contactosDe(values)`

**Esta es la tarea grande, y el spec explica por qué no es quirúrgica:** cuatro sitios ubican el teléfono con `mapping.indexOf(COL_TEL)`, que devuelve **solo la primera** ocurrencia. En cuanto dos columnas mapeen a `telefono`, esos `indexOf` siguen viendo una sola.

- [ ] **Step 1: Los tests que fallan**

```ts
describe('varias columnas de telefono', () => {
  // ECW: Chart#, nombre_crudo, DOB, telefono (Home), telefono (Cell), email
  const MAPPING_2TEL = ['nombre_crudo', 'fecha_nacimiento', 'telefono', 'telefono', 'email']

  it('las dos columnas de telefono entran como contactos', () => {
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,ANA', '31000', '3055550101', '7865550202', '']],
      mapping: MAPPING_2TEL, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(contactosDe(plan.toInsert[0]).map(c => c.valor).sort())
      .toEqual(['3055550101', '7865550202'])
  })

  it('Home == Cell da UN solo contacto, sin codigo que lo fuerce', () => {
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,ANA', '31000', '3055550101', '3055550101', '']],
      mapping: MAPPING_2TEL, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(contactosDe(plan.toInsert[0])).toHaveLength(1)
  })

  it('el principal es el primero no vacio', () => {
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,ANA', '31000', '', '7865550202', '']],
      mapping: MAPPING_2TEL, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(pacienteEntranteDe(plan.toInsert[0]).telefono).toBe('7865550202')
  })

  it('el saneamiento valida TODAS las columnas de telefono, no solo la primera', () => {
    const r = detectPacienteAnomalies('ecw', [['PEREZ,ANA', '31000', '3055550101', '123', '']], MAPPING_2TEL)
    if (r.estado !== 'ok') throw new Error('esperaba estado ok')
    expect(r.issues.some(i => i.messageKey === 'med.import.anomaly.invalidPhone')).toBe(true)
  })

  it('guessMapping manda las dos columnas de telefono a telefono', () => {
    expect(guessMapping(['Patient Name', 'DOB', 'Home Phone', 'Cell Phone', 'Email']))
      .toEqual(['nombre_crudo', 'fecha_nacimiento', 'telefono', 'telefono', 'email'])
  })
})
```

El cuarto es el que protege la regresión muda que describe el spec: hoy la segunda columna se valida vía `iTelAlt`, y al desaparecer `telefono_alt` esa validación se apaga sola si nadie la reescribe.

- [ ] **Step 2: Correr y verificar que fallan**

```bash
npx vitest run src/features/medical/utils/pacienteImportPlan
```

Esperado: FAIL — `contactosDe` no existe, y `guessMapping` devuelve `telefono_alt` en la cuarta posición.

- [ ] **Step 3: `pacienteFields` declara `multi` y suelta el hack**

```ts
export const PACIENTE_FIELD_DEFS: ImportFieldDef[] = [
  { column: 'nombre_crudo', labelKey: 'med.import.field.nombreCrudo' },
  { column: 'nombre', labelKey: 'med.import.field.nombre' },
  { column: 'apellido', labelKey: 'med.import.field.apellido' },
  { column: 'chart', labelKey: 'med.import.field.chart' },
  { column: 'fecha_nacimiento', labelKey: 'med.import.field.fechaNacimiento' },
  { column: 'genero', labelKey: 'med.import.field.genero' },
  { column: 'telefono', labelKey: 'med.import.field.telefono', multi: true },
  { column: 'email', labelKey: 'med.import.field.email', multi: true },
]
```

`telefono_alt` sale de la lista. Y `guessMapping` pierde el contador — ahora toda columna de teléfono mapea a `telefono`:

```ts
export function guessMapping(headers: string[]): (string | null)[] {
  return headers.map(h => {
    const norm = normHeader(h)
    // Toda columna de teléfono mapea al MISMO campo: `telefono` acumula (ver `multi`), así que
    // ya no hace falta inventarle un segundo campo a la segunda columna.
    if (TELEFONO_RE.test(norm)) return 'telefono'
    return resolveToCanonical(norm, PACIENTE_COLUMNS, { aliases: HEADER_ALIASES })
  })
}
```

Borrar la constante `COL_TEL_ALT` de `pacienteFields` si quedó sin uso y actualizar el comentario del bloque, que hoy explica el orden de aparición.

- [ ] **Step 4: Los `indexOf` pasan a listas**

En `pacienteImportPlan/index.ts`, agregar el helper y usarlo en los cuatro sitios:

```ts
// `indexOf` devuelve SOLO la primera ocurrencia. Con `telefono` acumulando varias columnas del
// archivo, quedarse con la primera apaga en silencio todo lo que dependa de las demás — la
// validación del saneamiento, entre otras cosas.
const indicesDe = (mapping: (string | null)[], col: string): number[] =>
  mapping.reduce<number[]>((acc, c, i) => (c === col ? [...acc, i] : acc), [])
```

- En `augmentar`: `const iTels = indicesDe(mapping, COL_TEL)`. **Borrar el bloque de "Home == Cell"** (el `if (tel && telAlt && tel === telAlt) telAltRaw = ''`) — el `.includes` de `buildImportPlan` y el `UNIQUE` lo cubren. Sacar `COL_TEL_ALT` de `SINTETICAS`.
- En `camposParaCandidato`: el teléfono para el matcheo es el **primero no vacío** de `iTels`.
- En `detectPacienteAnomalies`: recorrer `iTels` entero, no `[iTel, iTelAlt]`.
- `PACIENTE_KEYS`: sacar `'telefono_alt'`.

- [ ] **Step 4b: La columna sintética que lleva el DOB crudo**

`paciente_fuentes.dob_origen` existe desde la Tarea 1 y **hoy no lo escribe nadie**: se crearía
una columna siempre en `null`, o sea todo el mecanismo de "lo contradictorio" del spec (§3) sin
implementar. `augmentar` ya calcula `dobCrudo` para `claveOrigenDe`, así que llevarlo hasta la
escritura cuesta una columna sintética más:

```ts
const COL_DOB_ORIGEN = '__dob_origen__'
const SINTETICAS = [COL_NOMBRE, COL_APELLIDO, COL_CLAVE, COL_NOMBRE_ORIGEN, COL_DOB_ORIGEN, COL_FUENTE] as const
```

En `augmentar`, la fila augmentada suma `dobCrudo` en la posición de `COL_DOB_ORIGEN`. En
`coercePacienteCelda`, `COL_DOB_ORIGEN` devuelve el valor **tal cual** (como `COL_CLAVE` y
`COL_NOMBRE_ORIGEN`): es el crudo del archivo, no una fecha interpretada — una fecha ilegible es
justo el caso que hay que poder investigar después.

Y `fuenteEscrituraDe(values)` lo devuelve, para que la Tarea 6 lo escriba.

Test:

```ts
it('el DOB crudo del archivo viaja a la fuente, sin interpretar', () => {
  const plan = buildPacienteImportPlan({
    rows: [['PEREZ,ANA', '31000', '3055550101', '', '']],
    mapping: MAPPING_2TEL, dupMode: 'update', valueMap: {}, fuente: 'ecw',
    existentes: new Map(), pacientes: [],
  })
  expect(fuenteEscrituraDe(plan.toInsert[0]).dob_origen).toBe('31000')
})
```

- [ ] **Step 5: `contactosDe` y `pacienteEntranteDe`**

```ts
export type ContactoEntrante = { tipo: 'telefono' | 'email'; valor: string }

// Todos los valores de contacto que trajo la fila, ya normalizados por `coercePacienteCelda`.
// El principal (`pacienteEntranteDe`) es el primero de cada lista; acá están TODOS.
export function contactosDe(values: Record<string, unknown>): ContactoEntrante[] {
  const out: ContactoEntrante[] = []
  for (const tipo of ['telefono', 'email'] as const) {
    const v = values[tipo]
    const lista = Array.isArray(v) ? v : v == null ? [] : [v]
    for (const item of lista) {
      const valor = String(item ?? '').trim()
      if (valor) out.push({ tipo, valor })
    }
  }
  return out
}
```

Y en `pacienteEntranteDe`, para `telefono` y `email`, tomar el primero de la lista en vez del valor crudo.

- [ ] **Step 6: El paso 5 no puede recibir un array crudo**

`ImportModal` le pasa `entrante={m.values}` a `MergeCandidateRow` **antes** de que nadie extraiga el principal, y su `fmt()` hace `String(v)`: un array se vería `"3055550101,7865550202"` y la comparación marcaría *distinto* casi siempre — justo donde una persona decide si dos registros son el mismo.

En `PacientesImportModal`, resolver el principal antes de construir el plan que ve el paso 5, y sacar `telefono_alt` de `resolveCandidate`:

```ts
  const resolveCandidate = useCallback((id: string) => {
    const p = pacientesById.get(id)
    if (!p) return undefined
    return {
      label: `${p.mrn} — ${p.nombre} ${p.apellido}`,
      values: { nombre: p.nombre, apellido: p.apellido, fecha_nacimiento: p.fecha_nacimiento, telefono: p.telefono, email: p.email },
    }
  }, [pacientesById])
```

y mapear `plan.toMerge` a valores con el principal resuelto (`pacienteEntranteDe`) antes de pasarlo al modal.

- [ ] **Step 7: Correr los tests**

```bash
pnpm typecheck && npx vitest run
```

- [ ] **Step 8: Probar que muerden**

| Mutación | Test que TIENE que fallar |
|---|---|
| `indicesDe` devuelve `[mapping.indexOf(col)]` | "el saneamiento valida TODAS las columnas" |
| en `guessMapping`, volver el contador `telefonoUsado` | "guessMapping manda las dos columnas..." |
| `pacienteEntranteDe` toma `lista[1]` | "el principal es el primero no vacio" |

Reportar la evidencia literal.

- [ ] **Step 9: Commit**

---

## Task 5: Escribir los contactos, con el lote dedupeado

**Files:**
- Modify: `src/features/medical/utils/escribirImport/index.ts`
- Modify: `src/features/medical/components/PacientesImportModal/index.tsx`
- Modify: `src/features/medical/hooks/usePacientes.ts`
- Test: `src/features/medical/utils/escribirImport/index.test.ts`

**Interfaces:**
- Consumes: `contactosDe` (Tarea 4), `upsertPacienteContactos` (Tarea 1)
- Produces: `FilaEscritura.contactos`

- [ ] **Step 1: Los tests que fallan**

El archivo ya mockea la capa de datos con `vi.mock('@/features/medical/data/pacientes')` y tiene
los helpers `fuente(claveOrigen)` y `nueva(entrante, claveOrigen)`. Sumar el tercer mock y los
casos:

```ts
// al vi.mock existente:
//   upsertPacienteContactos: vi.fn(),
const upsertPacienteContactosMock = vi.mocked(upsertPacienteContactos)

// en el beforeEach: upsertPacienteContactosMock.mockReset()
//   .mockResolvedValue({ error: null } as Awaited<ReturnType<typeof upsertPacienteContactos>>)

const contactosEnviados = () => upsertPacienteContactosMock.mock.calls.flatMap(c => c[0])

function existente(id: string, claveOrigen: string, contactos: ContactoEntrante[]): FilaEscritura {
  return {
    tipo: 'existente', id,
    existente: { nombre: 'Maria', apellido: 'Garcia' },
    entrante: { nombre: 'Maria', apellido: 'Garcia' },
    fuente: fuente(claveOrigen),
    contactos,
  }
}

describe('contactos', () => {
  it('escribe los contactos DESPUES de pacientes y de fuentes', async () => {
    const orden: string[] = []
    upsertPacientesMock.mockImplementation(async () => { orden.push('pacientes'); return { error: null } })
    upsertPacienteFuentesMock.mockImplementation(async () => { orden.push('fuentes'); return { error: null } })
    upsertPacienteContactosMock.mockImplementation(async () => { orden.push('contactos'); return { error: null } })

    await escribirImport([{ ...nueva({ nombre: 'Ana', apellido: 'Perez' }, 'k1'), contactos: [{ tipo: 'telefono', valor: '305' }] }])

    expect(orden).toEqual(['pacientes', 'fuentes', 'contactos'])
  })

  it('dos filas fusionadas al mismo paciente NO mandan el contacto repetido', async () => {
    await escribirImport([
      existente('p1', 'a', [{ tipo: 'telefono', valor: '305' }]),
      existente('p1', 'b', [{ tipo: 'telefono', valor: '305' }]),
    ])
    expect(contactosEnviados()).toHaveLength(1)
  })

  it('el mismo valor desde DOS fuentes distintas manda las dos filas', async () => {
    // Que dos sistemas coincidan en un teléfono es la evidencia de que la fusión estuvo bien:
    // colapsarlas borraría justo esa información.
    const a = existente('p1', 'a', [{ tipo: 'telefono', valor: '305' }])
    const b = existente('p1', 'b', [{ tipo: 'telefono', valor: '305' }])
    b.fuente = { fuente: 'ecw', clave_origen: 'b', nombre_origen: null, ref_externa: null }
    await escribirImport([a, b])
    expect(contactosEnviados()).toHaveLength(2)
  })

  it('una fila rechazada por nombre vacio no manda sus contactos', async () => {
    await escribirImport([
      { ...nueva({ nombre: '', apellido: 'Perez' }, 'k1'), contactos: [{ tipo: 'telefono', valor: '305' }] },
    ])
    expect(contactosEnviados()).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Correr y verificar que fallan**

- [ ] **Step 3: Implementar**

`FilaEscritura` suma `contactos: ContactoEntrante[]` en las dos ramas de la unión. `FilaLista` acumula los contactos de todos sus miembros. Antes del upsert:

```ts
// Dedup por la MISMA clave que el UNIQUE de la base.
//
// Ojo con el porqué, porque es fácil escribirlo mal: con `ignoreDuplicates: true` (DO NOTHING)
// el lote NO aborta aunque vayan dos filas iguales — verificado contra Postgres. O sea que esto
// no es lo que evita el crash; lo que lo evita es esa opción en `data/pacientes.ts`.
// Se dedupea igual por dos razones concretas: que `contactosEscritos` cuente lo que de verdad
// se escribió y no lo que se mandó, y que el día que alguien cambie a DO UPDATE el lote no
// empiece a abortar en silencio.
function dedupeContactos(rows: Omit<PacienteContacto, 'id' | 'created_at'>[]) {
  const vistos = new Set<string>()
  return rows.filter(r => {
    const k = `${r.paciente_id}|${r.tipo}|${r.valor}|${r.fuente}`
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  })
}
```

El orden es `upsertPacientes` → `upsertPacienteFuentes` → `upsertPacienteContactos`: un contacto sin paciente viola la FK.

Sumar `contactosEscritos: number` a `ResultadoEscritura`.

- [ ] **Step 4: Enganchar el llamador**

En `PacientesImportModal.onConfirm`, agregar `contactos: contactosDe(values)` a cada `FilaEscritura`.

- [ ] **Step 5: Correr los tests y probar que muerden**

Mutación obligatoria: sacar el `dedupeContactos` → tiene que fallar exactamente "dos filas del archivo fusionadas...".

- [ ] **Step 6: Commit**

---

## Task 6: Los choques dejan de tirarse a la basura

**Files:**
- Modify: `src/features/medical/utils/pacienteIdentity/index.ts`
- Modify: `src/features/medical/utils/escribirImport/index.ts`
- Modify: `src/features/medical/components/PacientesImportModal/index.tsx`
- Modify: `src/shared/i18n/locales/es.json`, `en.json`
- Test: los dos `index.test.ts`

**Interfaces:**
- Consumes: nada nuevo
- Produces: `ResultadoEscritura.choques: { campo: string; n: number }[]`

Hoy `escribirImport:109` hace `fusionar(...).paciente` y **descarta `choques` entero**. Nadie más lo lee. El dato se pierde y el registro de que existió también.

- [ ] **Step 1: Los tests que fallan**

```ts
it('telefono y email NO generan choque: son contactos, no conflictos', () => {
  const { choques } = fusionar(
    { nombre: 'Ana', apellido: 'Perez', telefono: '305', email: 'a@x.test' },
    { nombre: 'Ana', apellido: 'Perez', telefono: '786', email: 'b@x.test' },
  )
  expect(choques).toEqual([])
})

it('fecha_nacimiento SI genera choque', () => {
  const { choques } = fusionar(
    { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-03-14' },
    { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-04-14' },
  )
  expect(choques).toEqual(['fecha_nacimiento'])
})

it('escribirImport devuelve los choques agrupados por campo', async () => {
  // dos filas existentes con DOB distinto al del paciente guardado
  const r = await escribirImport(filas)
  expect(r.choques).toEqual([{ campo: 'fecha_nacimiento', n: 2 }])
})
```

- [ ] **Step 2: Correr y verificar que fallan**

- [ ] **Step 3: Implementar**

En `pacienteIdentity/index.ts`, declarar qué campos ya no son conflicto y pasárselo a
`fusionarCampoSimple`:

```ts
// Un segundo teléfono o un segundo email NO son un conflicto: son otro contacto, y viven en
// `paciente_contactos`. Siguen fusionándose como campo principal (el existente gana), pero
// dejan de contarse como choque — si no, el usuario vería 681 "conflictos" que no lo son.
const NO_SON_CHOQUE = new Set<keyof Paciente>(['telefono', 'email'])
```

y en `fusionarCampoSimple`, la condición que empuja:

```ts
    if (tieneValor(valorEntrante) && valorExistente !== valorEntrante && !NO_SON_CHOQUE.has(campo)) {
      choques.push(String(campo))
    }
```

En `escribirImport`, `agruparPorId` hoy hace `fusionar(...).paciente` y tira el resto. Acumular:

```ts
  return orden.map((id) => {
    const miembros = grupos.get(id)!
    let acumulado = recortar(miembros[0].existente)
    const choques: string[] = []
    for (const m of miembros) {
      const r = fusionar(acumulado, recortar(m.entrante))
      acumulado = r.paciente
      choques.push(...r.choques)
    }
    return { id, paciente: acumulado, choques, miembros: miembros.map((m) => ({ fuente: m.fuente, origenIndice: m.origenIndice })) }
  })
```

`FilaLista` suma `choques: string[]`, y `ResultadoEscritura` suma:

```ts
  choques: { campo: string; n: number }[]
```

agrupado contando cuántas filas chocaron en cada campo.

- [ ] **Step 3b: `payloadFuente` escribe el DOB crudo**

Hoy la Tarea 1 dejó `dob_origen: null` fijo en el literal, para que compilara. Acá se llena de
verdad — sin esto la sección 3 del spec queda sin implementar:

```ts
function payloadFuente(pacienteId: string, fuente: FuenteEscritura): PacienteFuente {
  return {
    paciente_id: pacienteId,
    fuente: fuente.fuente,
    clave_origen: fuente.clave_origen,
    nombre_origen: fuente.nombre_origen ?? null,
    dob_origen: fuente.dob_origen ?? null,
    ref_externa: fuente.ref_externa ?? null,
    importado_at: new Date().toISOString(),
  }
}
```

`FuenteEscritura` suma `dob_origen?: string | null`.

Test: dos filas de la misma persona con fechas distintas tienen que dejar **las dos** fechas
crudas en sus respectivas filas de `paciente_fuentes` — que es lo que permite reconstruir qué
dijo cada sistema.

- [ ] **Step 4: Mostrarlos en el resumen**

Clave nueva en los dos idiomas:

```json
"med.import.choques": "{n} con {campo} en conflicto — gana el valor guardado, el otro queda en paciente_fuentes"
```

- [ ] **Step 5: Correr, probar que muerden, commitear**

---

## Task 7: El gate del DOB se abre por teléfono compartido

**Files:**
- Modify: `src/features/medical/utils/pacienteIdentity/index.ts`
- Test: `src/features/medical/utils/pacienteIdentity/index.test.ts`

**Interfaces:**
- Consumes: nada nuevo
- Produces: `candidatos()` con un caso más

**Es el código más delicado del módulo.** Hoy `candidatos()` exige DOB idéntico antes de mirar el nombre, así que los 76 casos medidos (mismo nombre, mismo teléfono, fecha distinta) entran como **76 pares de pacientes duplicados**.

- [ ] **Step 1: Los tests que fallan**

```ts
describe('gate del DOB', () => {
  const guardado = { id: 'p1', nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-03-14', telefono: '3055550101', email: null }

  it('mismo nombre + DOB distinto + telefono COMPARTIDO da candidato parcial', () => {
    const r = candidatos(
      { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-04-14', telefono: '3055550101' },
      [guardado],
    )
    expect(r).toHaveLength(1)
    expect(r[0].nivel).toBe('parcial')
  })

  it('mismo nombre + DOB distinto + telefono DISTINTO no da candidato', () => {
    const r = candidatos(
      { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-04-14', telefono: '7865559999' },
      [guardado],
    )
    expect(r).toEqual([])
  })

  it('el telefono compartido NUNCA promueve a exacta', () => {
    const r = candidatos(
      { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-04-14', telefono: '3055550101' },
      [guardado],
    )
    expect(r[0].nivel).not.toBe('exacta')
  })

  it('mismo DOB sigue dando exacta como antes', () => {
    const r = candidatos(
      { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-03-14', telefono: '3055550101' },
      [guardado],
    )
    expect(r[0].nivel).toBe('exacta')
  })

  it('una fila SIN DOB sigue sin dar candidatos, aunque comparta telefono', () => {
    const r = candidatos(
      { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: null, telefono: '3055550101' },
      [guardado],
    )
    expect(r).toEqual([])
  })

  it('nucleo distinto no matchea aunque compartan telefono (familia)', () => {
    const r = candidatos(
      { nombre: 'Carlos', apellido: 'Perez', fecha_nacimiento: '1990-01-01', telefono: '3055550101' },
      [guardado],
    )
    expect(r).toEqual([])
  })
})
```

El último es el que evita que el cambio fusione familias: comparten teléfono pero no nombre.

- [ ] **Step 2: Correr y verificar que fallan**

- [ ] **Step 3: Implementar**

```ts
// Sin DOB no hay candidatos: es el único ancla dura que tenemos. Eso NO cambia.
// Lo que cambia: con DOB en los dos lados pero distinto, el núcleo igual + un teléfono
// compartido alcanza para ofrecer una fusión PARCIAL. Medido sobre el archivo real: 76 núcleos
// con dos DOB comparten teléfono (la misma persona con una fecha mal cargada) y 59 no (homónimos
// distintos, que siguen separados). Sin la condición del teléfono, esto fusionaría homónimos.
export function candidatos(
  fila: Omit<Identificable, 'id'>,
  pacientes: readonly Identificable[],
): Candidato[] {
  if (!fila.fecha_nacimiento) return []

  const nucleoFila = nucleo(fila.nombre, fila.apellido)
  const resultado: Candidato[] = []

  for (const paciente of pacientes) {
    const mismoDob = paciente.fecha_nacimiento === fila.fecha_nacimiento
    const relacion = relacionNucleos(nucleoFila, nucleo(paciente.nombre, paciente.apellido))
    if (relacion === 'ninguna') continue

    if (!mismoDob) {
      // Nunca 'exacta': la fecha no coincide, así que la evidencia es más débil por definición.
      // Parcial = sin pre-marcar, la persona decide con las dos fechas enfrentadas en pantalla.
      if (relacion === 'igual' && telefonoCompartido(fila, paciente)) {
        resultado.push({ nivel: 'parcial', paciente })
      }
      continue
    }

    const nivel: NivelMatch =
      relacion === 'igual' && !contactoDisjunto(fila, paciente) ? 'exacta' : 'parcial'
    resultado.push({ nivel, paciente })
  }
  return resultado
}

function telefonoCompartido(a: Contacto, b: Contacto): boolean {
  return tieneValor(a.telefono) && tieneValor(b.telefono) && a.telefono === b.telefono
}
```

- [ ] **Step 4: Correr los tests**

- [ ] **Step 5: Probar que muerden**

| Mutación | Test que TIENE que fallar |
|---|---|
| `telefonoCompartido` → `return true` | "telefono DISTINTO no da candidato" y "nucleo distinto no matchea" |
| `nivel: 'parcial'` → `'exacta'` en la rama de DOB distinto | "el telefono compartido NUNCA promueve a exacta" |
| sacar `if (!fila.fecha_nacimiento) return []` | "una fila SIN DOB sigue sin dar candidatos" |
| `relacion === 'igual'` → `relacion !== 'ninguna'` en la rama nueva | ninguno de los de arriba; **si no falla nada, falta un test** para el caso "núcleo contenido, DOB distinto" |

- [ ] **Step 6: Commit**

---

## Task 8: `telefono_alt` se elimina

**Files:**
- Create: `supabase/migrations/<timestamp>_drop_telefono_alt.sql`
- Modify: `src/features/medical/types.ts`
- Modify: `src/features/medical/demo-data.ts`
- Modify: `src/features/medical/utils/escribirImport/index.ts`
- Modify: los tests que lo nombren

**Va última a propósito:** recién acá nada lo escribe. Hacerla antes deja el árbol sin compilar entre tareas.

⚠️ En local hay **42 filas con `telefono_alt` cargado** y el `DROP` se las lleva. Son datos de prueba y se reconstruyen reimportando la hoja (`(fuente, clave_origen)` ya existe), pero hay que hacerlo sabiendo.

- [ ] **Step 1: La migración**

```sql
-- `telefono_alt` era el parche para "una persona tiene dos números", que ahora modela
-- `paciente_contactos`. Ver el spec 2026-08-23-contactos-multivaluados-design.md.
-- IF EXISTS para que el .sql se pueda aplicar dos veces por psql, como el resto.
ALTER TABLE public.pacientes DROP COLUMN IF EXISTS telefono_alt;
```

- [ ] **Step 2: Aplicarla dos veces y verificar que no falla la segunda**

- [ ] **Step 3: Sacarla del código**

`types.ts` (la línea de `Paciente`), `demo-data.ts` (los 8 literales — son dato muerto pero están tipados contra `Paciente`), `escribirImport` (`CAMPOS_FUSIONABLES` y `payloadPaciente`), y los tests que la nombren.

- [ ] **Step 4: Verificar**

```bash
pnpm typecheck && pnpm test && pnpm build:check
grep -rn "telefono_alt" src/ || echo "sin rastros"
```

- [ ] **Step 5: Commit**

---

## Task 9: El alta manual acumula en vez de pisar

**Files:**
- Modify: `src/features/medical/components/PacienteModal.tsx`
- Modify: `src/features/medical/hooks/usePacientes.ts`

**Sin esto el bug original vuelve por la puerta de al lado:** `PacienteModal` guarda con un `.update()` crudo, sin pasar por `fusionar` ni por contactos, así que editar un teléfono a mano lo pisa y lo pierde.

- [ ] **Step 1: Al guardar, el valor viejo y el nuevo van los dos a la tabla**

En `usePacientes.editPaciente`, antes del `updatePaciente`:

```ts
// El principal pasa a ser el nuevo -acá sí, a diferencia de un import: una edición a mano es una
// decisión explícita de una persona-. Pero el anterior NO se pierde: queda como contacto.
// Sin esto, editar un teléfono lo pisa y lo borra, que es exactamente el bug que motivó todo
// este trabajo, reintroducido por la puerta del alta manual.
const previo = pacientes.find(p => p.id === id)
const contactos: Omit<PacienteContacto, 'id' | 'created_at'>[] = []
for (const tipo of ['telefono', 'email'] as const) {
  for (const valor of [previo?.[tipo], data[tipo]]) {
    const v = (valor ?? '').trim()
    if (v) contactos.push({ paciente_id: id, tipo, valor: v, fuente: 'manual', clave_origen: null })
  }
}
if (contactos.length) await upsertPacienteContactos(contactos)
```

El `upsert` con `ignoreDuplicates: true` hace que guardar dos veces el mismo número deje **una**
fila, sin necesidad de comparar antes.

- [ ] **Step 2: Probarlo en el navegador**

Editar el teléfono de un paciente y comprobar en la base:

```bash
docker exec supabase_db_eminat-app psql -U postgres -d postgres -c \
  "SELECT tipo, valor, fuente FROM public.paciente_contactos WHERE paciente_id = '<id>'"
```

Esperado: **dos** filas de `telefono`, las dos con `fuente = 'manual'`. Y guardar dos veces el mismo número tiene que seguir dejando una sola fila por valor.

- [ ] **Step 3: Commit**

---

## Task 10: El detalle del paciente muestra los contactos

**Files:**
- Modify: el componente de detalle de paciente en `src/features/medical/components/`
- Create: `src/features/medical/components/ContactoRow/index.tsx` + `index.module.css`
- Modify: `src/shared/i18n/locales/es.json`, `en.json`

Sin esto, todo lo anterior guarda datos que nadie puede ver — y el objetivo era **poder desambiguar una fusión equivocada**, que se hace mirando.

- [ ] **Step 1: El componente de fila**

Carpeta propia con su CSS (regla de `componentes.md`: lo que se repite en un `.map()` es un componente). Muestra el valor y **de qué sistema vino** — la procedencia es el punto, no un adorno.

- [ ] **Step 2: Listarlos en el detalle**, agrupados por tipo, con el principal marcado.

- [ ] **Step 3: Claves i18n en los dos idiomas.**

- [ ] **Step 4: Verificar en el navegador y commitear**

---

## Task 11: La prueba de fuego y el cierre

- [ ] **Step 1: Verificación completa**

```bash
pnpm typecheck && pnpm test && pnpm build:check
```

- [ ] **Step 2: Importar el archivo real en local**

Es la única prueba que ejercita los 681 casos. Backup primero (Tarea 1, paso 1). **No imprimir valores de pacientes**: conteos y agregados.

Después del import de las tres hojas:

```sql
-- tiene que haber MÁS contactos de teléfono que pacientes
SELECT (SELECT count(*) FROM paciente_contactos WHERE tipo='telefono') AS contactos,
       (SELECT count(*) FROM pacientes) AS pacientes;

-- ningún paciente cuya fila traía teléfono puede quedar sin contacto
SELECT count(*) FROM pacientes p
WHERE p.telefono IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM paciente_contactos c WHERE c.paciente_id = p.id AND c.tipo='telefono');
-- esperado: 0

-- los que tienen 2+ números: comparar contra los 681 medidos
SELECT count(*) FROM (
  SELECT paciente_id FROM paciente_contactos WHERE tipo='telefono'
  GROUP BY paciente_id HAVING count(DISTINCT valor) > 1
) t;
```

- [ ] **Step 3: Reimportar el mismo archivo**

Esperado: **0 contactos nuevos**. El `UNIQUE` lo garantiza en la base; lo que se comprueba acá es que la aplicación no lo intente igual y aborte un lote.

- [ ] **Step 4: Deshacer**

```bash
supabase/rollback/deshacer-import-local.sh <el predump de la Tarea 1> <la seq anotada>
```

- [ ] **Step 5: Los avisos en `.todo/TODO.md`**

Un cambio que altera lo que alguien ya vio se avisa (`proceso.md`). Como mínimo: **`telefono_alt` desapareció** (cualquier consulta o vista apoyada en esa columna se va a ver vacía, no rota), y **el import ahora ofrece fusiones que antes no ofrecía** — los 76 casos de fecha contradictoria aparecen como candidato parcial sin marcar, así que quien importe va a ver preguntas nuevas.

- [ ] **Step 6: Commit final**

---

## Notas de la auto-revisión

- **Hueco encontrado ejecutando, no revisando (24/08):** `dob_origen` se creaba en la Tarea 1 y
  **no lo escribía ninguna tarea** — habría llegado como una columna siempre en `null`, o sea la
  §3 del spec entera sin implementar. Lo destapó el reporte del agente de la Tarea 1 al decir
  "whichever task consumes the DOB gate will fill it in properly later": esa tarea no existía.
  Ahora se llena entre el Step 4b de la Tarea 4 (la columna sintética que lo transporta) y el
  Step 3b de la Tarea 6 (el `payloadFuente` que lo escribe). La auto-revisión de cobertura del
  spec no lo cazó porque miré "¿hay tarea que toque `dob_origen`?" y la había — crearlo. La
  pregunta correcta era "¿hay tarea que lo ESCRIBA?".
- **Cobertura del spec:** las 5 secciones del diseño tienen tarea (1 → §1 y §3, 2/3 → §2.b y §2.c, 4 → §2 y §2.b, 5 → §1, 6 → §4, 7 → §3.b, 9 → §5). Los 7 criterios de verificación del spec están repartidos entre las tareas 1, 4, 5, 7, 9 y 11.
- **`telefono_alt` se borra en la Tarea 8 y no antes**, para que el árbol compile entre tareas. Es la única dependencia de orden fuerte del plan, junto con "la Tarea 4 necesita la 2".
- **Lo que este plan NO hace**, igual que el spec: no resuelve las contradicciones (las expone), no abre el matcheo a las filas sin DOB, y no hace multivaluados a dirección, seguro ni alergias — no vienen en el archivo.

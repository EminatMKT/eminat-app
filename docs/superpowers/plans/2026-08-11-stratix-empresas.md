# Stratix 360 contra el catálogo de empresas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Stratix 360 lea las marcas del catálogo `empresas` que el admin ya administra, eliminando la constante hardcodeada `MARCAS_LIST`.

**Architecture:** Una migración agrega `recibe_actividades` a `empresas` y convierte `actividades.empresa` en FK real sobre `empresas.codigo`. Dos funciones puras derivan del catálogo la lista de marcas y el mapa código→color; `AppContext` las expone y los diez call sites del front las consumen. El borrado final de la constante es lo que prueba que no quedó ningún consumidor.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (Postgres + PostgREST), Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-11-stratix-empresas-design.md`

## Global Constraints

- **Sin `any`.** ESLint tiene `no-explicit-any: error`. Usar `Pick`/`Omit`/`Partial` sobre los tipos existentes.
- **i18n obligatorio.** Todo string visible sale de `useT()`/`t()` con su clave en `shared/i18n/locales/es.json` **y** `en.json`. Nunca `i18n-ignore`.
- **Claves i18n planas**, con el prefijo del módulo: `"admin.org.activo": "Activa"`.
- **Supabase local debe estar corriendo** (`pnpm supabase start`). El proyecto local es `http://127.0.0.1:54321`; la DB directa es `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- **Nunca correr `pnpm supabase db reset`** durante este trabajo: recrea la base desde `migrations/` + `seed/` y las 18 actividades de prueba no están en el seed. Para aplicar migraciones usar `pnpm supabase migration up`.
- **Animaciones**: si hiciera falta alguna, usar `shared/motion`, no Framer Motion directo. (Este plan no agrega ninguna.)
- **Convención de commits:** en español, imperativo, tipo convencional (`feat:`, `refactor:`, `test:`, `chore:`).

---

### Task 1: Migración de esquema

Agrega el flag de atribución y convierte `actividades.empresa` en FK real.

**Files:**
- Create: `supabase/migrations/<timestamp>_empresas_marca_atribuible.sql`

**Interfaces:**
- Consumes: nada.
- Produces: columna `empresas.recibe_actividades boolean NOT NULL DEFAULT false`; constraint `actividades_empresa_fkey`; la columna `actividades.empresa_id` deja de existir.

- [ ] **Step 1: Verificar que no haya códigos huérfanos**

Si alguna actividad referencia un código que no existe en `empresas`, la creación de la FK falla a mitad de la migración. Correr:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
SELECT DISTINCT a.empresa FROM actividades a
 LEFT JOIN empresas e ON e.codigo = a.empresa
 WHERE e.codigo IS NULL;"
```

Esperado: `(0 rows)`. Si devuelve filas, **parar**: hay que crear esas empresas o corregir los códigos antes de seguir, y eso es una decisión del dueño del producto.

- [ ] **Step 2: Crear el archivo de migración**

```bash
pnpm supabase migration new empresas_marca_atribuible
```

Esto crea `supabase/migrations/<timestamp>_empresas_marca_atribuible.sql` vacío.

- [ ] **Step 3: Escribir la migración**

Contenido completo del archivo:

```sql
-- Stratix leía las marcas de una constante hardcodeada (MARCAS_LIST) que se
-- desincronizó del catálogo `empresas`: 7 entradas contra 11 filas. El catálogo
-- tiene dos clases de empresa conviviendo — las que reciben actividades de
-- marketing y las que solo son lugar de pertenencia de una persona — y sin
-- distinguirlas el selector de actividades ofrecería "Ondara Media" como marca.

-- 1. Qué empresas reciben actividades. Default false: una empresa nueva es de
--    pertenencia salvo que el admin diga lo contrario.
ALTER TABLE public.empresas
  ADD COLUMN recibe_actividades boolean NOT NULL DEFAULT false;

-- Se marcan exactamente las 7 que MARCAS_LIST mostraba, para que el día del
-- deploy nadie vea un cambio de comportamiento: lo que cambia es que ahora se
-- administra desde /admin en vez de un deploy.
UPDATE public.empresas SET recibe_actividades = true
 WHERE codigo IN ('EMC','SVN','ERG','VNF','PREMIER','ORNELLA','MENTOR');

-- 2. Integridad por clave natural. `empresas.codigo` es UNIQUE y NOT NULL, y no
--    codifica ningún dato que ya viva por separado, así que sirve como destino
--    de FK — mismo criterio que `usuarios.rol -> roles.key`.
--    ON UPDATE CASCADE: renombrar un código desde el admin propaga a las
--    actividades. El borrado queda en RESTRICT (default): una empresa con
--    actividades no se puede borrar, solo desactivar.
ALTER TABLE public.actividades
  ADD CONSTRAINT actividades_empresa_fkey
  FOREIGN KEY (empresa) REFERENCES public.empresas(codigo) ON UPDATE CASCADE;

-- 3. La FK por uuid nunca se pobló (0 de 18 filas) ni tuvo call sites. Tener las
--    dos es tener dos fuentes de verdad que pueden divergir.
ALTER TABLE public.actividades DROP COLUMN empresa_id;
```

- [ ] **Step 4: Aplicar en local**

```bash
pnpm supabase migration up
```

Esperado: la migración aparece como aplicada, sin errores.

- [ ] **Step 5: Verificar el resultado**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
select codigo, activo, recibe_actividades from empresas order by recibe_actividades desc, codigo;" -c "
select conname from pg_constraint where conname = 'actividades_empresa_fkey';" -c "
select count(*) from information_schema.columns
 where table_name='actividades' and column_name='empresa_id';"
```

Esperado: 7 empresas con `recibe_actividades = t` (EMC, ERG, MENTOR, ORNELLA, PREMIER, SVN, VNF) y 4 en `f`; la constraint existe; el count de `empresa_id` es `0`.

- [ ] **Step 6: Verificar que la FK bloquea de verdad**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
begin; delete from empresas where codigo = 'EMC'; rollback;"
```

Esperado: error `update or delete on table "empresas" violates foreign key constraint "actividades_empresa_fkey" on table "actividades"`. El `rollback` garantiza que no se borra nada aunque pasara.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): marca qué empresas reciben actividades y cierra la FK por código

Agrega \`recibe_actividades\` para distinguir las marcas a las que se atribuyen
actividades de las empresas que solo son lugar de pertenencia, y convierte
\`actividades.empresa\` en FK real sobre \`empresas.codigo\`.

El backfill marca las mismas 7 que la constante hardcodeada ya mostraba, así
que el comportamiento no cambia — cambia quién lo controla.

Dropea \`actividades.empresa_id\`, que nunca se pobló ni tuvo call sites: tener
las dos columnas es tener dos fuentes de verdad que pueden divergir."
```

---

### Task 2: Derivaciones puras + tests

Las dos funciones que traducen el catálogo en lo que el front necesita. Van en su propio módulo, como `team-derivations.ts`, para poder testearlas sin React.

**Files:**
- Create: `shared/context/empresa-derivations.ts`
- Create: `shared/context/empresa-derivations.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `deriveMarcas(empresas: E[]): E[]` — las empresas ofrecibles para una actividad nueva.
  - `deriveColorMarca(empresas: E[]): Record<string, string>` — mapa `codigo → color` de **todas** las empresas.
  - `COLOR_MARCA_FALLBACK: string` — el color cuando un código no está en el mapa.
  - `E` es el tipo estructural `{ codigo, color?, activo?, recibe_actividades? }`; `OrgRow` lo satisface.

- [ ] **Step 1: Escribir el test que falla**

Crear `shared/context/empresa-derivations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveMarcas, deriveColorMarca, COLOR_MARCA_FALLBACK } from './empresa-derivations'

const empresas = [
  { codigo: 'EMC', color: '#60A5FA', activo: true, recibe_actividades: true },
  { codigo: 'SVN', color: '#F472B6', activo: true, recibe_actividades: true },
  // de pertenencia: existe y está activa, pero no se le atribuyen actividades
  { codigo: 'ONDARA', color: '#06B6D4', activo: true, recibe_actividades: false },
  // desactivada: ya no opera, aunque siga marcada como atribuible
  { codigo: 'VIEJA', color: '#F87171', activo: false, recibe_actividades: true },
]

describe('deriveMarcas', () => {
  it('ofrece solo las activas y atribuibles', () => {
    expect(deriveMarcas(empresas).map(e => e.codigo)).toEqual(['EMC', 'SVN'])
  })

  it('excluye una desactivada aunque sea atribuible', () => {
    // La UI impide armar ese estado, pero la API y el SQL directo no: el filtro
    // no confía en esa invariante.
    expect(deriveMarcas(empresas).map(e => e.codigo)).not.toContain('VIEJA')
  })
})

describe('deriveColorMarca', () => {
  it('incluye TODAS las empresas, también las desactivadas y las no atribuibles', () => {
    // Es la regla que sostiene el histórico: una actividad de una empresa
    // desactivada se sigue pintando con su color, no con el fallback.
    expect(deriveColorMarca(empresas)).toEqual({
      EMC: '#60A5FA', SVN: '#F472B6', ONDARA: '#06B6D4', VIEJA: '#F87171',
    })
  })

  it('omite las empresas sin color en vez de mapearlas a undefined', () => {
    expect(deriveColorMarca([{ codigo: 'X', activo: true, recibe_actividades: true }])).toEqual({})
  })
})

describe('COLOR_MARCA_FALLBACK', () => {
  it('es el violeta que ya usaba getColorMarca', () => {
    expect(COLOR_MARCA_FALLBACK).toBe('#7C6FF7')
  })
})
```

- [ ] **Step 2: Correr el test para verificar que falla**

```bash
pnpm vitest run shared/context/empresa-derivations.test.ts
```

Esperado: FAIL — `Failed to resolve import "./empresa-derivations"`.

- [ ] **Step 3: Escribir la implementación mínima**

Crear `shared/context/empresa-derivations.ts`:

```ts
// Deriva de `empresas` lo que Stratix necesita, reemplazando la constante
// hardcodeada MARCAS_LIST.

type E = {
  codigo: string
  color?: string
  activo?: boolean
  recibe_actividades?: boolean
}

// El violeta que devolvía getColorMarca cuando un código no estaba en la lista.
export const COLOR_MARCA_FALLBACK = '#7C6FF7'

// Las empresas ofrecibles al crear una actividad. `activo` es el interruptor
// maestro y `recibe_actividades` un permiso que solo aplica sobre una activa; se
// chequean los dos porque la invariante la impone la UI, no la base.
export function deriveMarcas<T extends E>(empresas: T[]): T[] {
  return empresas.filter(e => e.activo && e.recibe_actividades)
}

// codigo -> color de TODAS las empresas, sin filtrar. Una actividad de una
// empresa desactivada o no atribuible se sigue pintando con su color: el
// histórico no se reescribe cuando cambia la configuración.
export function deriveColorMarca(empresas: E[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const e of empresas) if (e.color) map[e.codigo] = e.color
  return map
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

```bash
pnpm vitest run shared/context/empresa-derivations.test.ts
```

Esperado: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add shared/context/empresa-derivations.ts shared/context/empresa-derivations.test.ts
git commit -m "feat(context): deriva marcas y colores del catálogo de empresas

Dos funciones puras que reemplazan a MARCAS_LIST, en su propio módulo para
testearlas sin React — mismo patrón que team-derivations.

La asimetría entre las dos es deliberada y está cubierta por tests: deriveMarcas
filtra por activo y recibe_actividades, deriveColorMarca no filtra nada. Si
alguna vez se unifican, las actividades de una empresa desactivada perderían su
color de un día para el otro."
```

---

### Task 3: Exponer las derivaciones en el contexto

**Files:**
- Modify: `shared/context/loadAppData.ts:83-93` (interfaz `OrgRow`)
- Modify: `shared/context/AppContext.tsx:2` (import de `useMemo`), `:14` (import de tipos), `:16` (import de derivaciones), `:31-80` (interfaz), `:87-89` (derivaciones), `:100-112` (provider)

**Interfaces:**
- Consumes: `deriveMarcas`, `deriveColorMarca` de la Task 2.
- Produces: `useApp().marcas: OrgRow[]` y `useApp().colorMarca: Record<string, string>`.

**Nota:** `shared/data/org.ts:16` hace `select('*')`, así que `recibe_actividades` ya viaja en la respuesta sin tocar la query.

- [ ] **Step 1: Agregar el campo al tipo `OrgRow`**

En `shared/context/loadAppData.ts`, dentro de `export interface OrgRow`, después de `activo?: boolean`:

```ts
  activo?: boolean
  recibe_actividades?: boolean
```

- [ ] **Step 2: Importar `useMemo` y las derivaciones en AppContext**

En `shared/context/AppContext.tsx`, línea 2, agregar `useMemo`:

```ts
import { createContext, useContext, useMemo, ReactNode } from 'react'
```

Y después del import de `team-derivations` (línea 16):

```ts
import { deriveMarcas, deriveColorMarca } from './empresa-derivations'
```

- [ ] **Step 3: Declarar los dos campos en la interfaz del contexto**

En `interface AppContextType`, justo debajo de `empresas: OrgRow[]` (línea 61):

```ts
  empresas: OrgRow[]
  // Derivados de `empresas` para Stratix. `marcas` filtra por activo +
  // recibe_actividades; `colorMarca` cubre TODAS para no perder el color de las
  // actividades históricas de una empresa desactivada.
  marcas: OrgRow[]
  colorMarca: Record<string, string>
```

- [ ] **Step 4: Calcular los derivados en el provider**

En `AppProvider`, después de `const equipoMarketing = deriveEquipoMarketing(app.usuarios)` (línea 89):

```ts
  const marcas = useMemo(() => deriveMarcas(app.empresas), [app.empresas])
  const colorMarca = useMemo(() => deriveColorMarca(app.empresas), [app.empresas])
```

- [ ] **Step 5: Pasarlos al provider**

En el objeto `value`, después de `equipoMarketing,` (línea 105):

```ts
        equipoMarketing,
        marcas,
        colorMarca,
```

- [ ] **Step 6: Verificar que compila**

```bash
pnpm typecheck
```

Esperado: sin errores.

- [ ] **Step 7: Commit**

```bash
git add shared/context/AppContext.tsx shared/context/loadAppData.ts
git commit -m "feat(context): expone marcas y colorMarca desde AppContext

Los consumidores de Stratix pasan a tener el catálogo derivado sin re-filtrar
cada uno por su cuenta. La query de empresas ya traía la columna nueva: org.ts
usa select('*')."
```

---

### Task 4: Checkbox en el form de catálogos

El form del admin se genera desde `ORG_CATALOGS` y hoy soporta `text | number | color | icon | select`. Falta `checkbox`, que sirve a los dos flags de empresas.

**Files:**
- Modify: `features/admin/org-catalogs.ts:13` (union de `type`), `:37-41` (campos de empresas)
- Modify: `features/admin/components/OrgModal.tsx:22` (estado inicial), `:26-27` (helpers), `:56-92` (renderer)
- Modify: `shared/i18n/locales/es.json`, `shared/i18n/locales/en.json`

**Interfaces:**
- Consumes: `recibe_actividades` en `OrgRow` (Task 3).
- Produces: `OrgField['type']` acepta `'checkbox'`; el form de empresas edita `activo` y `recibe_actividades`.

- [ ] **Step 1: Agregar `checkbox` al tipo de campo**

En `features/admin/org-catalogs.ts`, línea 13:

```ts
  type: 'text' | 'number' | 'color' | 'icon' | 'select' | 'checkbox'
```

- [ ] **Step 2: Declarar los dos campos en el catálogo de empresas**

En `ORG_CATALOGS.empresas.fields`, después del campo `color`:

```ts
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
      { name: 'codigo', type: 'text', labelKey: 'admin.org.codigo' },
      { name: 'color', type: 'color', labelKey: 'admin.org.color' },
      { name: 'activo', type: 'checkbox', labelKey: 'admin.org.activo' },
      { name: 'recibe_actividades', type: 'checkbox', labelKey: 'admin.org.recibeActividades' },
    ],
```

- [ ] **Step 3: Agregar las claves i18n en español**

En `shared/i18n/locales/es.json`, junto a las otras `admin.org.*`:

```json
  "admin.org.activo": "Activa",
  "admin.org.activoHint": "Si se desactiva, deja de ofrecerse — las actividades ya cargadas no se tocan.",
  "admin.org.recibeActividades": "Recibe actividades",
  "admin.org.recibeActividadesHint": "Aparece como marca al crear una actividad en Stratix.",
```

- [ ] **Step 4: Agregar las claves i18n en inglés**

En `shared/i18n/locales/en.json`, en la misma posición relativa:

```json
  "admin.org.activo": "Active",
  "admin.org.activoHint": "If turned off, it stops being offered — existing activities are left untouched.",
  "admin.org.recibeActividades": "Receives activities",
  "admin.org.recibeActividadesHint": "Shows up as a brand when creating an activity in Stratix.",
```

- [ ] **Step 5: Ampliar los helpers del form a booleanos**

En `features/admin/components/OrgModal.tsx`, reemplazar las líneas 26-27:

```ts
  const value = (f: OrgField) => String(form[f.name] ?? '')
  const set = (f: OrgField, v: string) => setForm(p => ({ ...p, [f.name]: v }))
```

por:

```ts
  const value = (f: OrgField) => String(form[f.name] ?? '')
  const checked = (f: OrgField) => form[f.name] === true
  const set = (f: OrgField, v: string | boolean) => setForm(p => ({ ...p, [f.name]: v }))
```

- [ ] **Step 6: Arrancar el alta con la empresa activa**

En la línea 22, el estado inicial. Sin esto una empresa nueva se ve con el checkbox desmarcado mientras la DB le pone `activo = true` por default, y el form miente:

```ts
  const [form, setForm] = useState<Partial<OrgRow>>(row ?? { color: COLORES_AVATAR[0], activo: true })
```

- [ ] **Step 7: Renderizar el checkbox**

En la cadena de tipos del renderer, agregar una rama **antes** del `select` (línea 59), y envolver el label para no mostrarlo dos veces. Reemplazar el bloque completo del `.map` (líneas 56-92) por:

```tsx
      {def.fields.map(f => {
        // `recibe_actividades` solo tiene sentido sobre una empresa activa: si el
        // interruptor maestro está apagado, este queda deshabilitado para que el
        // estado contradictorio no se pueda armar desde la UI.
        const off = f.name === 'recibe_actividades' && form.activo === false
        return (
          <div key={f.name} style={{ marginBottom: 14 }}>
            {f.type !== 'checkbox' && (
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t(f.labelKey)}{f.required ? ' *' : ''}</label>
            )}
            {f.type === 'checkbox' ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.5 : 1 }}>
                <input type="checkbox" checked={checked(f)} disabled={off}
                  onChange={e => set(f, e.target.checked)} style={{ cursor: off ? 'not-allowed' : 'pointer' }} />
                <span style={{ fontSize: 12, color: t2 }}>{t(f.labelKey)}</span>
                <span style={{ fontSize: 10, color: t3 }}>{t(`${f.labelKey}Hint` as typeof f.labelKey)}</span>
              </label>
            ) : f.type === 'select' ? (
              <select value={value(f)} onChange={e => set(f, e.target.value)} style={inputStyle}>
                {!f.required && <option value="">{t('admin.org.none')}</option>}
                {optionsFor(f).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === 'number' ? (
              <input type="number" min={0} max={24} step={0.5} value={value(f)} onChange={e => set(f, e.target.value)} style={inputStyle} />
            ) : f.type === 'icon' ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {ICONOS.map(ic => {
                  const on = value(f) === ic
                  return (
                    <button key={ic} type="button" onClick={() => set(f, on ? '' : ic)}
                      style={{ width: 32, height: 32, fontSize: 16, lineHeight: 1, borderRadius: 8, cursor: 'pointer', border: `1px solid ${on ? accent : border}`, background: on ? `${accent}1A` : 'transparent' }}>
                      {ic}
                    </button>
                  )
                })}
                {/* Escape hatch: cualquier emoji fuera del set curado. */}
                <input type="text" value={value(f)} onChange={e => set(f, e.target.value)} maxLength={4}
                  placeholder="…" title={t('admin.org.iconoLibre')}
                  style={{ ...inputStyle, width: 46, textAlign: 'center', padding: '6px 0' }} />
              </div>
            ) : f.type === 'color' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORES_AVATAR.map(c => (
                  <div key={c} onClick={() => set(f, c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: value(f) === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />
                ))}
              </div>
            ) : (
              <input type="text" value={value(f)} onChange={e => set(f, e.target.value)} style={inputStyle} />
            )}
          </div>
        )
      })}
```

- [ ] **Step 8: Verificar que compila y lintea**

```bash
pnpm typecheck && pnpm lint
```

Esperado: sin errores. Si `t(\`${f.labelKey}Hint\`)` da error de tipo por `I18nKey`, reemplazar esa línea por un hint explícito por campo en vez del template:

```tsx
                <span style={{ fontSize: 10, color: t3 }}>
                  {f.name === 'activo' ? t('admin.org.activoHint') : t('admin.org.recibeActividadesHint')}
                </span>
```

- [ ] **Step 9: Verificar a mano en el navegador**

Con `pnpm dev` corriendo, entrar a `/admin` → Organización → Empresas → editar una. Comprobar: los dos checkboxes aparecen; al destildar "Activa" el de "Recibe actividades" queda deshabilitado y gris; guardar persiste el valor (reabrir el modal y ver el estado).

- [ ] **Step 10: Commit**

```bash
git add features/admin/org-catalogs.ts features/admin/components/OrgModal.tsx shared/i18n/locales/es.json shared/i18n/locales/en.json
git commit -m "feat(admin): checkboxes de activo y recibe_actividades en empresas

El form genérico no tenía tipo booleano; se agrega \`checkbox\` al renderer y
sirve a los dos flags. \`activo\` se expone ahora porque el front va a filtrar
por él: hasta hoy la columna existía con default true y solo se podía cambiar
por SQL, así que filtrar por ella habría sido especulativo.

\`recibe_actividades\` se deshabilita si la empresa está inactiva — activo es el
interruptor maestro y el estado contradictorio no debería poder armarse desde
la UI."
```

---

### Task 5: Arreglar el chequeo de "en uso" al borrar

`blockedBy` compara contra el uuid de la fila. Con `actividades.empresa` guardando el código, ese chequeo contaría 0 y dejaría intentar un borrado que después revienta con el error crudo de Postgres.

**Files:**
- Modify: `features/admin/org-catalogs.ts:27` (tipo `blockedBy`), `:42-47` (entradas de empresas)
- Modify: `app/api/admin/org/[cat]/[id]/route.ts:32-34`

**Interfaces:**
- Consumes: la FK de la Task 1.
- Produces: `blockedBy` acepta `matchOn?: 'id' | 'codigo'`.

- [ ] **Step 1: Ampliar el tipo `blockedBy`**

En `features/admin/org-catalogs.ts`, en `type CatalogDef`, reemplazar la línea 27:

```ts
  /** Dependientes que bloquean el borrado (patrón Roles: bloquear + avisar). */
  blockedBy: { table: string; column: string }[]
```

por:

```ts
  /** Dependientes que bloquean el borrado (patrón Roles: bloquear + avisar).
   *  `matchOn` dice contra qué valor de la fila compara la columna dependiente:
   *  'id' para las FK por uuid, 'codigo' para las que apuntan a la clave natural
   *  (actividades.empresa -> empresas.codigo). Default 'id'. */
  blockedBy: { table: string; column: string; matchOn?: 'id' | 'codigo' }[]
```

- [ ] **Step 2: Corregir la entrada de actividades**

En `ORG_CATALOGS.empresas.blockedBy`:

```ts
    blockedBy: [
      { table: 'usuarios', column: 'empresa_id' },
      { table: 'actividades', column: 'empresa', matchOn: 'codigo' },
      { table: 'solicitudes', column: 'empresa_id' },
      { table: 'slots_calendario', column: 'empresa_id' },
    ],
```

`solicitudes` y `slots_calendario` siguen con `empresa_id` a propósito: la Task 1 no las tocó porque están en 0 filas y sin funcionalidad.

- [ ] **Step 3: Resolver el valor a comparar en el route**

En `app/api/admin/org/[cat]/[id]/route.ts`, reemplazar las líneas 32-34:

```ts
  const counts = await Promise.all(ORG_CATALOGS[params.cat].blockedBy.map(({ table, column }) =>
    db.from(table).select('*', { count: 'exact', head: true }).eq(column, params.id),
  ))
```

por:

```ts
  // Las FK por clave natural comparan contra `codigo`, no contra el uuid: hay que
  // leer la fila antes para saber qué valor buscar.
  const necesitaCodigo = ORG_CATALOGS[params.cat].blockedBy.some(b => b.matchOn === 'codigo')
  const codigo = necesitaCodigo
    ? (await db.from(params.cat).select('codigo').eq('id', params.id).single()).data?.codigo
    : undefined

  const counts = await Promise.all(ORG_CATALOGS[params.cat].blockedBy.map(({ table, column, matchOn }) =>
    db.from(table).select('*', { count: 'exact', head: true })
      .eq(column, matchOn === 'codigo' ? codigo : params.id),
  ))
```

- [ ] **Step 4: Verificar que compila**

```bash
pnpm typecheck
```

Esperado: sin errores.

- [ ] **Step 5: Verificar a mano que el borrado se bloquea con el mensaje correcto**

Con `pnpm dev` corriendo, en `/admin` → Organización → Empresas, intentar borrar **EMC** (tiene 3 actividades).

Esperado: el mensaje "Está en uso por N registro(s). Reasignalos antes de borrar." — **no** un error de Postgres sobre violación de foreign key. Si aparece el error crudo, el `matchOn` no se está aplicando.

Después intentar borrar **DACOACH** (no tiene actividades ni personas): debe borrarse. Volver a crearla desde el mismo panel para no dejar el catálogo alterado (`DaCoach IS`, código `DACOACH`, color `#A78BFA`, activa, sin recibir actividades).

- [ ] **Step 6: Commit**

```bash
git add features/admin/org-catalogs.ts "app/api/admin/org/[cat]/[id]/route.ts"
git commit -m "fix(admin): el chequeo de uso soporta FK por clave natural

blockedBy comparaba siempre contra el uuid de la fila. Con actividades.empresa
guardando el código, ese chequeo contaba 0 y dejaba intentar un borrado que
después reventaba con el error crudo de Postgres en vez del mensaje de que la
empresa está en uso.

matchOn declara contra qué valor compara cada dependiente. La FK sigue siendo
la defensa real; esto es lo que hace que el aviso llegue antes."
```

---

### Task 6: Migrar los seis call sites de color

**Files:**
- Modify: `features/stratix-mkt/components/kanban/KanbanTaskCard.tsx:2,9`
- Modify: `features/stratix-mkt/components/gantt/GanttBar.tsx:2,19`
- Modify: `features/stratix-mkt/components/modals/ActivityDetailModal.tsx:2,29`
- Modify: `features/stratix-mkt/components/solicitudes/TaskTableRow.tsx:2,16`
- Modify: `features/stratix-mkt/components/solicitudes/MemberAvailabilityCard.tsx:2,63`
- Modify: `features/stratix-mkt/components/social/AccountRow.tsx:2,11`

**Interfaces:**
- Consumes: `useApp().colorMarca` y `COLOR_MARCA_FALLBACK` (Tasks 2 y 3).
- Produces: nada que otras tareas consuman.

En los seis, el patrón es el mismo: sacar `getColorMarca` del import y tomar `colorMarca` del hook que el componente ya llama.

- [ ] **Step 1: `KanbanTaskCard.tsx`**

Import (línea 2):

```tsx
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
```

Agregar `colorMarca` a lo que se destructura de `useApp()` en ese componente, y reemplazar la línea 9:

```tsx
  const marcaColor = colorMarca[a.empresa] ?? COLOR_MARCA_FALLBACK
```

- [ ] **Step 2: `GanttBar.tsx`**

Import (línea 2):

```tsx
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
```

Agregar `colorMarca` al destructuring de `useApp()`, y arriba del `return` del componente:

```tsx
  const marcaColor = colorMarca[a.empresa] ?? COLOR_MARCA_FALLBACK
```

Reemplazar en la línea 19 las dos llamadas `getColorMarca(a.empresa)` por `marcaColor`:

```tsx
          <span style={{ padding: '1px 5px', borderRadius: 4, background: `${marcaColor}25`, color: marcaColor, fontSize: 8 }}>{a.empresa}</span>
```

- [ ] **Step 3: `ActivityDetailModal.tsx`**

Import (línea 2):

```tsx
import { useApp, ESTADO_COLORS, SOLICITANTES, COLUMNAS_KANBAN, mesATrimestre } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
```

`SOLICITANTES` se mantiene: se elimina en la fase 2.

Agregar `colorMarca` al destructuring de `useApp()`, y antes del `return`:

```tsx
  const marcaColor = colorMarca[modalVerAct.empresa] ?? COLOR_MARCA_FALLBACK
```

Reemplazar la línea 29:

```tsx
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: `${marcaColor}25`, color: marcaColor, fontWeight: 600 }}>{modalVerAct.empresa}</span>
```

- [ ] **Step 4: `TaskTableRow.tsx`**

Import (línea 2):

```tsx
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
```

Agregar `colorMarca` al destructuring, y antes del `return`:

```tsx
  const marcaColor = colorMarca[a.empresa] ?? COLOR_MARCA_FALLBACK
```

Reemplazar la línea 16:

```tsx
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${marcaColor}25`, color: marcaColor, fontWeight: 600 }}>{a.empresa}</span>
```

- [ ] **Step 5: `MemberAvailabilityCard.tsx`**

Import (línea 2):

```tsx
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
```

Agregar `colorMarca` al destructuring. La línea 63 está dentro de un `.map` sobre actividades, así que el color se resuelve inline:

```tsx
              <span style={{ color: colorMarca[a.empresa] ?? COLOR_MARCA_FALLBACK, marginRight: 5 }}>●</span>{a.titulo}
```

- [ ] **Step 6: `AccountRow.tsx`**

Import (línea 2):

```tsx
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
```

Agregar `colorMarca` al destructuring, y reemplazar la línea 11:

```tsx
      <td style={{ padding: '10px' }}><span style={badgeStyle(colorMarca[acc.brand] ?? COLOR_MARCA_FALLBACK)}>{acc.brand}</span></td>
```

`acc.brand` viene de `social_accounts`, que es texto libre sin FK: si no matchea ningún código cae al fallback, igual que hoy.

- [ ] **Step 7: Verificar que compila**

```bash
pnpm typecheck
```

Esperado: sin errores.

- [ ] **Step 8: Commit**

```bash
git add features/stratix-mkt/components/
git commit -m "refactor(stratix): el color de marca sale del catálogo, no de la constante

Los seis lugares que pintaban con getColorMarca pasan a leer el mapa derivado
del contexto. El fallback se mantiene explícito por si un código no está en el
catálogo — el caso real es social_accounts.brand, que es texto libre sin FK."
```

---

### Task 7: Migrar los cuatro call sites de la lista

**Files:**
- Modify: `shared/components/TopbarBrands.tsx:2,9`
- Modify: `features/stratix-mkt/hooks/useStratixData.ts:2,57`
- Modify: `features/stratix-mkt/components/social/SocialTab.tsx:2,20`
- Modify: `features/stratix-mkt/components/modals/NewActivityModal.tsx:2,32`

**Interfaces:**
- Consumes: `useApp().marcas` (Task 3).
- Produces: nada que otras tareas consuman.

Dos diferencias de forma entre `MARCAS_LIST` y `OrgRow`, las dos ya verificadas contra el código:

1. **`label` pasa a ser `nombre`.** Ningún consumidor lo usa hoy: `BrandBar.tsx:11` y `BrandStats.tsx:13` muestran `codigo`, no la etiqueta larga. El único lugar donde aparecía era el `<option>` de `NewActivityModal`.
2. **`color` pasa de requerido a opcional.** `BrandBar.tsx:4` y `BrandStats.tsx:5` tipan `color: string`, y `OrgRow` declara `color?: string`. Los objetos que se les pasan tienen que resolver el fallback antes, o el typecheck falla.

- [ ] **Step 1: `TopbarBrands.tsx`**

Archivo completo (son 12 líneas, se reemplaza entero):

```tsx
'use client'
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import BrandChip from './BrandChip'

// Chips de las marcas del grupo en el topbar.
export default function TopbarBrands() {
  const { marcas } = useApp()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {marcas.map(m => <BrandChip key={m.codigo} codigo={m.codigo} color={m.color ?? COLOR_MARCA_FALLBACK} />)}
    </div>
  )
}
```

- [ ] **Step 2: `useStratixData.ts`**

Import (línea 2), sacando `MARCAS_LIST`:

```ts
import { useApp, MESES, MESES_Q, mesATrimestre } from '@/shared/context/AppContext'
```

Agregar al import, en la línea 3:

```ts
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
```

Agregar `marcas` al destructuring de `useApp()` de la línea 15, y reemplazar la línea 57. El `color` se resuelve acá porque `BrandBar` lo tipa como requerido:

```ts
  const datosPorMarca = marcas
    .map(m => ({ ...m, color: m.color ?? COLOR_MARCA_FALLBACK, total: actsFiltradas.filter(a => a.empresa === m.codigo).length }))
    .filter(m => m.total > 0)
```

El único consumidor es `OverviewTab.tsx:50`, que se lo pasa a `BrandBar` — y `BrandBar.tsx:11` muestra `m.codigo`, así que no hay nada más que tocar ahí.

- [ ] **Step 3: `SocialTab.tsx`**

Import (línea 2), sacando `MARCAS_LIST`, y agregar el fallback:

```tsx
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
```

Agregar `marcas` al destructuring de la línea 11, y reemplazar la línea 20. Igual que arriba, `BrandStats` tipa `color: string`:

```tsx
  const brandTotals = marcas.map(m => {
```

y dentro de ese `.map`, en el objeto que devuelve (línea 22), reemplazar el spread por uno con el color resuelto:

```tsx
    return { ...m, color: m.color ?? COLOR_MARCA_FALLBACK, followers: accs.reduce((s, a) => s + a.followers, 0), growth: accs.reduce((s, a) => s + a.followersChange, 0), reach: accs.reduce((s, a) => s + a.reach, 0), engagement: accs.length > 0 ? Math.round(accs.reduce((s, a) => s + a.engagement, 0) / accs.length * 10) / 10 : 0, posts: accs.reduce((s, a) => s + a.posts, 0) }
```

El cuerpo del `.map` no usa `m.label`, y `BrandStats.tsx:13` muestra `b.codigo`: no hay más cambios.

- [ ] **Step 4: `NewActivityModal.tsx`**

Import (línea 2), sacando `MARCAS_LIST` y dejando el resto:

```tsx
import { useApp, MESES, COLUMNAS_KANBAN, SOLICITANTES } from '@/shared/context/AppContext'
```

Agregar `marcas` al destructuring de la línea 6, y reemplazar la línea 32:

```tsx
              {marcas.map(a => <option key={a.codigo} value={a.codigo}>{a.codigo} — {a.nombre}</option>)}
```

- [ ] **Step 5: Verificar que compila**

```bash
pnpm typecheck
```

Esperado: sin errores. Un error del tipo `Type 'string | undefined' is not assignable to type 'string'` señala un objeto que se le pasa a `BrandBar` o `BrandStats` sin resolver el fallback de color.

- [ ] **Step 6: Commit**

```bash
git add shared/components/TopbarBrands.tsx features/stratix-mkt/
git commit -m "refactor(stratix): las marcas salen del catálogo administrable

El selector de actividad, la gráfica por marca, SocialTab y los chips del
topbar leen \`marcas\` del contexto. Crear o renombrar una empresa en Admin →
Organización ahora se refleja sin deploy, que era el objetivo.

MARCAS_LIST exponía \`label\` y el catálogo expone \`nombre\`: los consumidores
se ajustan al nombre real de la columna."
```

---

### Task 8: Borrar la constante y verificar el conjunto

Borrar `MARCAS_LIST` es el test de que no quedó ningún consumidor: si falta uno, el typecheck falla.

**Files:**
- Modify: `shared/constants/domain.ts:29-37,66-68`
- Modify: `shared/context/AppContext.tsx:22-26`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `MARCAS_LIST` y `getColorMarca` dejan de existir.

- [ ] **Step 1: Borrar las definiciones**

En `shared/constants/domain.ts`, eliminar el bloque `export const MARCAS_LIST = [...]` (líneas 29-37) y la función `getColorMarca` (líneas 66-68).

**No tocar** `MESES`, `TRIMESTRES`, `DOMINIOS_VALIDOS`, `MESES_Q`, `mesATrimestre`, `ESTADO_COLORS`, `COLUMNAS_KANBAN`, `COLORES_AVATAR`, `getIniciales` ni `SOLICITANTES` — esta última se elimina en la fase 2.

- [ ] **Step 2: Borrar los re-exports**

En `shared/context/AppContext.tsx`, el bloque de re-exports queda:

```ts
export {
  MESES, TRIMESTRES, MESES_Q, mesATrimestre, ESTADO_COLORS,
  COLUMNAS_KANBAN, SOLICITANTES, COLORES_AVATAR,
  getIniciales,
} from '@/shared/constants/domain'
```

- [ ] **Step 3: Verificar que no quedó ningún consumidor**

```bash
grep -rn "MARCAS_LIST\|getColorMarca" --include=*.ts --include=*.tsx shared/ features/ app/
```

Esperado: sin resultados.

- [ ] **Step 4: Correr la verificación completa**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Esperado: los tres en verde. Un error de typecheck acá significa que quedó un call site sin migrar en las tasks 6 o 7.

- [ ] **Step 5: Verificación manual de punta a punta**

Con `pnpm supabase start` y `pnpm dev` corriendo:

1. **Alta se refleja sin deploy** — en `/admin` → Organización → Empresas, crear "Marca Test" (código `TEST`, un color, activa, recibe actividades). Ir a Stratix → nueva actividad: `TEST — Marca Test` aparece en el selector de marca.
2. **El flag filtra** — editar `TEST` y destildar "Recibe actividades". El selector de nueva actividad ya no la ofrece.
3. **El histórico sobrevive a la desactivación** — en el panel, destildar "Activa" en `EMC` (tiene 3 actividades). Comprobar que en el Kanban esas 3 tarjetas **siguen** con el celeste de EMC y siguen contando en la gráfica por marca, pero que EMC ya no aparece al crear una actividad nueva. Volver a activarla.
4. **El borrado avisa** — intentar borrar `EMC`: aparece "Está en uso por N registro(s)", no un error de Postgres.
5. **Limpieza** — borrar "Marca Test" del catálogo.

- [ ] **Step 6: Commit**

```bash
git add shared/constants/domain.ts shared/context/AppContext.tsx
git commit -m "refactor: elimina MARCAS_LIST y getColorMarca

Ya no tienen consumidores: las marcas y sus colores salen del catálogo
\`empresas\`. Borrarlas es lo que prueba que la migración de los diez call sites
está completa — si faltara uno, el typecheck no compila.

Quedan en domain.ts las constantes que sí lo son: meses, trimestres, estados y
columnas del Kanban. SOLICITANTES sigue hasta la fase 2, porque sus valores son
responsable_ref y su destino depende de esa decisión."
```

---

## Al terminar

El `CLAUDE.md` describe la convención de FK como "surrogate vs clave natural legible". Este trabajo mostró que falta una condición: la clave natural además tiene que ser `UNIQUE`, `NOT NULL` y no codificar datos que ya existen por separado — es lo que distingue a `empresas.codigo` de `usuarios.responsable_ref`. Conviene actualizar esa sección con el criterio completo.

La fase 2 (eliminar `responsable_ref` y `solicitado_por`, y con ellos `SOLICITANTES`) está diagnosticada en la sección "Fuera de scope" del spec y necesita su propio brainstorming antes de planificarse.

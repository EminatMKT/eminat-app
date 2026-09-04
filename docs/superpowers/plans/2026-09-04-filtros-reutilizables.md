# Filtros reutilizables y vistas guardadas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el motor de filtros en una pieza que cualquier módulo pueda montar, y que cada persona pueda guardar combinaciones con nombre y saltar entre ellas.

**Architecture:** Cuatro fases. La 1 despega `FilterBar` del tema de los tableros —tres props de estilo que los dos consumidores pasan idénticos— y con eso la barra se puede montar en cualquier módulo. La 2 crea `vistas_filtro`: las combinaciones con nombre van a tabla porque son un artefacto que la persona creó, mientras que «qué filtro tengo puesto ahora» se queda en localStorage, donde ya está. La 3 arma la pieza: un hook que junta las dos mitades, un selector de vistas, un menú para esconder filtros, y un `FiltersPanel` que reemplaza los dos paneles de filtros duplicados que hay hoy. La 4 sale del análisis de aplicabilidad y **no bloquea a las anteriores**: le agrega al motor el `kind: 'chips'` que le falta, separa las etiquetas de los filtros, y despega `ListToolbar` de su tema — las tres cosas que hacen falta para que el motor entre en los seis módulos restantes.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Supabase (PostgreSQL + RLS, migraciones por CLI) · Vitest · Playwright (e2e)

**Spec:** `docs/superpowers/specs/2026-09-04-filtros-reutilizables-design.md`

## Estado (04/09/2026)

**Hechas: la 1, la 2 y la 10** — commits `0bc5503`, `701cb33`, `63ddb89`. **Lo próximo es la 3.**

Tres cosas del plan original cambiaron al ejecutarlo, y este documento ya está corregido:

1. **La carpeta es `src/shared/components/filters/`, no `ui/`.** Los seis componentes del motor son
   una pieza y sueltos entre veinte de `ui/` no se veía. Su barrel exporta **UNA** cosa: hoy
   `FilterBar`, y cuando exista `FiltersPanel` pasa a ser ése — `SelectFilter`, `InputFilter` y
   `ChipFilter` son el adentro de la barra y se toman entre hermanos.
2. **Los nombres van en inglés**, como el resto del motor (`applyFilters`, `resolveFilterValues`):
   `useFilters`, `FiltersPanel`, `visibleDefs`, `sameFilters`.
3. **Salió un componente que el plan no tenía: `InputFilter`.** Es el `<input>` que `FilterBar`
   dibujaba a mano adentro de su `.map()`, al lado de un `<SelectFilter />` que sí era componente.
   Lo destapó una regla del centinela que ese día estrenó detector.

Y dos archivos nuevos en `src/shared/utils/filters/` que la tarea 2 necesitó: `types.ts` (las tres
formas, que no entraban en `defs/`) y `compare/` (`sameFilters`, que no es un valor por defecto).

La **tarea 10 se adelantó** a la fase 1: el barrido señaló que `ListToolbar` y `FilterBar`
comparten su fila, y resultó más chica de lo escrito — `inputStyle` no era un prop, salía de
`useApp()` adentro, así que ningún consumidor cambió.

## Global Constraints

Reglas del centinela que aplican a cada tarea. Se verifican antes de cada edición; el mensaje de bloqueo trae el *Motivo* y eso se arregla, no se esquiva.

- **El atributo `style` está prohibido.** Las medidas van en `rem` y los colores salen de variables CSS. Es la deuda que la fase 1 viene a pagar: no se puede introducir más.
- **Una preferencia nueva se justifica** (regla escrita el 04/09/2026 junto con este plan; la administra el centinela): la línea de arriba de cada `useUserPreference` dice por qué va local. El criterio es el costo de reconstruirlo — lo que se rehace con un click va a localStorage, lo que la persona **nombró** va a tabla. Es la decisión que separa el estado vivo de los filtros de las vistas guardadas, y está escrita para que no se re-litigue por costumbre.
- **Un archivo se lee de una sentada: 50 líneas, y 150 es el techo.** Si una edición pasa el techo, el archivo se parte — no se agrega una marca de exención sin aprobación de Wagner.
- **Un componente es una carpeta, no un archivo**, y exporta UNA cosa por default.
- **Un archivo que viene acompañado vive en una carpeta**: si nace con test, es `carpeta/index.ts` + `carpeta/index.test.ts`, no dos archivos sueltos.
- **Un `index` de carpeta que agrupa sólo re-exporta.**
- **Un directorio de `src/shared/` se importa por su barrel**, no módulo por módulo. Si un tipo hace falta afuera, se re-exporta desde el barrel.
- **Lo que se devuelve se arma en una variable con nombre**, no en un literal dentro del `return`.
- **Un parámetro objeto se desestructura en la firma.**
- **Nada de `../../`:** fuera del vecindario se importa con `@/`.
- **i18n: integrar, no ignorar.** Todo texto visible sale de `t()` con su clave en `es.json` **y** `en.json`. Nada de `i18n-ignore`.
- **Ban de `any`.** Se tipa con `Pick`/`Omit`/`Partial`, no con casts.
- **Nombres de columnas FK:** `<entidad>_id` para clave surrogate (uuid).
- **`supabase db reset` está PROHIBIDO en este repo.** Se usa `pnpm supabase migration up`.
- **Antes de un `db push` a prod: backup y precheck, en ese orden.**
- **Nada de `git add -A`:** se stagea por ruta.
- **No se commitea sin que Wagner apruebe.** Los pasos de commit dejan el árbol listo y muestran qué entra; la aprobación es de él.

Valores exactos que se repiten en varias tareas:

| Qué | Valor |
|---|---|
| Tabla nueva | `vistas_filtro` |
| Constante en `TABLES` | `vistasFiltro: 'vistas_filtro'` |
| Ámbitos de esta tanda | `'tasks'` y `'research'` |
| Clave de localStorage | `filtros:<ambito>` (vía `useUserPreference`, que le antepone `eminat:<userId>:`) |
| Orden de resolución | defaults del código **<** vista que abre por defecto **<** lo tocado en la sesión |
| Variable CSS nueva | `--c-border-strong: #D1D5DB` |

**El repo no tiene entorno DOM en Vitest** (corre en node, sin `@testing-library`). No se estrena una infraestructura de testing en este plan: la lógica pura lleva test de Vitest, y lo que sólo se ve en pantalla se verifica a mano en el navegador y, donde valga, con Playwright — que ya está en `e2e/`.

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| **Modificar** `src/app/globals.css` | La variable `--c-border-strong` |
| **Crear** `src/shared/components/filters/FilterBar/index.module.css` | El look de la barra, hoy en objetos `CSSProperties` |
| **Modificar** `src/shared/components/filters/FilterBar/index.tsx` | Sin los tres props de estilo; suma el picker |
| **Modificar** `src/shared/components/filters/SelectFilter/index.tsx` | `className` en vez de `style` |
| **Modificar** `src/shared/components/dashboard/theme.ts` | Se borran `filterSelectStyle` y `filterClearStyle` |
| **Crear** `src/shared/components/filters/InputFilter/` | El `<input>` que la barra dibujaba a mano en su `.map()` |
| **Crear** `src/shared/components/filters/index.ts` | El barrel del motor: exporta UNA cosa |
| **Modificar** `src/shared/utils/filters/defs/index.ts` | `visibleDefs` |
| **Crear** `src/shared/utils/filters/types.ts` | Las tres formas, que no entraban en `defs/` |
| **Crear** `src/shared/utils/filters/compare/index.ts` | `sameFilters` — comparar no es calcular un default |
| **Modificar** `src/shared/utils/filters/defaults/index.ts` | Tercera capa en `resolveFilterValues` |
| **Crear** `supabase/migrations/<ts>_vistas_filtro.sql` | La tabla, su RLS y sus índices |
| **Crear** `supabase/rollback/vistas-filtro-rollback.sql` | Cómo se deshace |
| **Modificar** `src/shared/data/tables.ts` | `vistasFiltro` |
| **Crear** `src/shared/data/vistas-filtro.ts` | El repo de la tabla |
| **Modificar** `src/shared/data/index.ts` | El namespace `vistasFiltroRepo` y el tipo |
| **Crear** `src/shared/hooks/useFilters/vistas.ts` | El CRUD de vistas contra el repo |
| **Crear** `src/shared/hooks/useFilters/index.ts` | Estado local + vistas: el contrato que consumen los módulos |
| **Modificar** `src/shared/hooks/index.ts` | Re-export de `useFilters` |
| **Crear** `src/shared/components/filters/FilterPicker/` | El «+ Filtro»: un `<details>` con checkboxes |
| **Crear** `src/shared/components/filters/FilterPresets/` | El desplegable de vistas + guardar, borrar, marcar |
| **Crear** `src/shared/components/filters/FiltersPanel/` | El armador que montan los módulos |
| **Modificar** `src/features/tasks/hooks/useTablero/filtros.ts` | Pasa a `useFilters('tasks', …)` |
| **Borrar** `src/features/tasks/components/overview/StratixFiltersPanel/` | Lo reemplaza `FiltersPanel` |
| **Modificar** `src/features/research/hooks/useResearchData.ts` | Pasa a `useFilters('research', …)` |
| **Borrar** `src/features/research/components/FiltersPanel.tsx` | Ídem |
| **Modificar** `src/shared/i18n/locales/{es,en}.json` | Claves `common.filter.*` |
| **Crear** `src/shared/components/filters/ChipFilter/` | Fase 4: el cuarto control del motor, hermano de `SelectFilter` |
| **Crear** `src/shared/components/ui/Tag/` | Fase 4: lo que se lee, separado de lo que se elige |
| **Modificar** `src/shared/components/ui/ListToolbar/` | Fase 4: sin `inputStyle` por props |

---

# Fase 1 — la barra se despega del tema

### Task 1: ✅ HECHA (0bc5503) — `FilterBar` y `SelectFilter` sin estilos por props

Los dos consumidores (`StratixFiltersPanel` y el `FiltersPanel` de Research) le pasan **los mismos valores**: `filterSelectStyle` y `filterClearStyle` salen del mismo módulo, y `mutedColor` es `DASHBOARD_THEME.t3` en uno y `RESEARCH_THEME.t3` en el otro — que es el mismo objeto re-exportado. Los props no configuran nada.

**No hay test unitario acá y no se inventa uno:** el repo no tiene entorno DOM. La verificación es `pnpm typecheck` —que falla si algún consumidor sigue pasando los props borrados— más una pasada por el navegador.

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/shared/components/filters/FilterBar/index.module.css`
- Modify: `src/shared/components/filters/FilterBar/index.tsx`
- Modify: `src/shared/components/filters/SelectFilter/index.tsx`
- Modify: `src/shared/components/dashboard/theme.ts`
- Modify: `src/features/tasks/components/overview/StratixFiltersPanel/index.tsx`
- Modify: `src/features/research/components/FiltersPanel.tsx`

**Interfaces:**
- Consumes: `FilterDef<T>`, `FilterValues` (ya existen), las variables `--c-*` de `globals.css`.
- Produces: `FilterBar` sin `selectStyle` / `clearStyle` / `mutedColor`; `SelectFilter` con `className?: string` en vez de `style?: CSSProperties`. Los consume la tarea 7.

- [ ] **Step 1: La variable que falta**

Un solo color de la barra no tiene variable: el `#D1D5DB` del borde de los `<select>`, más fuerte que `--c-border` (`#E5E7EB`). En `src/app/globals.css`, justo debajo de `--c-border`:

```css
  --c-border: #E5E7EB;
  /* Un gris más fuerte que --c-border, para el borde de los controles de formulario: sobre
     --c-s1 (blanco) el borde suave se pierde y el <select> deja de leerse como clickeable. */
  --c-border-strong: #D1D5DB;
```

- [ ] **Step 2: El CSS module de la barra**

`src/shared/components/filters/FilterBar/index.module.css`:

```css
/* El look de la barra de filtros. Vivía como objetos CSSProperties en
   `shared/components/dashboard/theme.ts` que cada consumidor tenía que pasarle por props — y los
   dos pasaban lo mismo. Acá deja de ser configurable, que es lo que la vuelve montable en
   cualquier módulo sin importar el tema de los tableros. */

.bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.875rem;
  flex-wrap: wrap;
  align-items: center;
}

.control {
  padding: 0.375rem 0.75rem;
  border-radius: 0.625rem;
  border: 1px solid var(--c-border-strong);
  background: var(--c-s1);
  color: var(--c-t1);
  font-size: 0.75rem;
  font-family: 'DM Sans', sans-serif;
  outline: none;
}

/* El input date ignora el placeholder (muestra dd/mm/aaaa), así que su rótulo va visible. */
.dateLabel {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  color: var(--c-t3);
}

.clear {
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-t2);
  font-size: 0.6875rem;
  cursor: pointer;
}

.results {
  font-size: 0.6875rem;
  color: var(--c-t3);
  margin-left: auto;
}
```

- [ ] **Step 3: `SelectFilter` recibe una clase**

En `src/shared/components/filters/SelectFilter/index.tsx`, cambiar sólo la forma del prop de estilo — el comentario de cabecera y la lógica de la opción huérfana no se tocan:

```tsx
'use client'
import type { FilterDef } from '@/shared/utils'

export default function SelectFilter<T>({ def, items, value, onChange, label, className }: {
  def: FilterDef<T>
  items: T[]
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}) {
  const options = def.options?.(items) ?? []
  const orphan = value && !options.includes(value) ? value : null
  const labelOf = (v: string) => def.optionLabel?.(v) ?? v
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={className}>
      <option value="">{label}</option>
      {options.map(o => <option key={o} value={o}>{labelOf(o)}</option>)}
      {orphan && <option value={orphan}>{labelOf(orphan)}</option>}
    </select>
  )
}
```

Nótese el import: pasa de `@/shared/utils/filters` a `@/shared/utils` — es la regla del barrel, y el archivo se está tocando igual.

- [ ] **Step 4: `FilterBar` sin los tres props**

`src/shared/components/filters/FilterBar/index.tsx`:

```tsx
'use client'
import type { FilterDef, FilterValues } from '@/shared/utils'
import SelectFilter from '@/shared/components/filters/SelectFilter'
import s from './index.module.css'

// Barra de filtros genérica, guiada por los defs: un control por def + Clear + contador.
//
// NO recibe su look por props. Lo recibía —`selectStyle`, `clearStyle`, `mutedColor`— y los dos
// únicos consumidores le pasaban exactamente lo mismo, así que la configurabilidad no configuraba
// nada: sólo obligaba a cada módulo nuevo a conseguirse un tema de tablero para montarla.
export default function FilterBar<T>({ defs, items, values, onChange, onClear, labelFor, clearLabel, resultsLabel }: {
  defs: FilterDef<T>[]
  items: T[]
  values: FilterValues
  onChange: (key: string, value: string) => void
  onClear: () => void
  labelFor: (def: FilterDef<T>) => string
  clearLabel: string
  resultsLabel: string
}) {
  const active = defs.some(d => values[d.key])
  return (
    <div className={s.bar}>
      {defs.map(d => d.kind && d.kind !== 'select' ? (
        <label key={d.key} className={s.dateLabel}>
          {d.kind === 'date' && labelFor(d)}
          <input type={d.kind} value={values[d.key] ?? ''} placeholder={labelFor(d)}
            onChange={e => onChange(d.key, e.target.value)} className={s.control} />
        </label>
      ) : (
        <SelectFilter key={d.key} def={d} items={items} value={values[d.key] ?? ''}
          onChange={v => onChange(d.key, v)} label={labelFor(d)} className={s.control} />
      ))}
      {active && <button onClick={onClear} className={s.clear}>✕ {clearLabel}</button>}
      <span className={s.results}>{resultsLabel}</span>
    </div>
  )
}
```

- [ ] **Step 5: Borrar los objetos de estilo del tema**

En `src/shared/components/dashboard/theme.ts`, borrar `filterSelectStyle` y `filterClearStyle` completos, con su bloque de comentario. Borrar también el `import type { CSSProperties } from 'react'` de la primera línea si no queda nadie usándolo.

`DASHBOARD_THEME` y `CHART_COLORS` **no se tocan**: los usan las cards y las gráficas.

- [ ] **Step 6: Los dos consumidores dejan de pasarlos**

En `src/features/tasks/components/overview/StratixFiltersPanel/index.tsx`, la llamada queda:

```tsx
      <FilterBar defs={actFilters} items={actividades} values={filterValues}
        onChange={setFilterValue} onClear={clearFilters}
        labelFor={d => t(d.labelKey as I18nKey)}
        clearLabel={t('stratix.filter.clear')}
        resultsLabel="" /* el conteo filtrado ya ES la card "Total tareas" de abajo */ />
```

y el import de `theme` se reduce a lo que siga usando:

```tsx
import { DASHBOARD_THEME } from '@/shared/components/dashboard/theme'
```

Si `DASHBOARD_THEME` ya no se usa en el archivo, se borra la línea entera.

En `src/features/research/components/FiltersPanel.tsx`, lo mismo: se borra el import de
`filterSelectStyle, filterClearStyle` y los tres props de la llamada. `RESEARCH_THEME` se sigue
usando para el chip de la cabecera, así que ese import queda.

- [ ] **Step 7: Verificar que el compilador atrapa lo que quedó**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Esperado: PASS. Si falla con «Object literal may only specify known properties … `selectStyle`», es un consumidor que no se limpió — ese error es la prueba de que el paso 6 sirve.

- [ ] **Step 8: Verificar en el navegador que no cambió nada**

```bash
pnpm dev
```

Abrir `/tasks` → Dashboard y `/research`. La barra de filtros tiene que verse **idéntica** a antes: mismo alto, mismo borde, mismo gris del contador. Es un refactor de presentación: si algo se movió, el CSS module no reprodujo un valor.

- [ ] **Step 9: Gate y commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido && pnpm build:check
```

```bash
git add src/app/globals.css src/shared/components/filters/FilterBar/ src/shared/components/filters/SelectFilter/ src/shared/components/dashboard/theme.ts src/features/tasks/components/overview/StratixFiltersPanel/ src/features/research/components/FiltersPanel.tsx
git commit -m "refactor(filtros): la barra deja de recibir su look por props

Los dos consumidores le pasaban exactamente los mismos objetos de estilo, así que
la configurabilidad no configuraba nada: sólo obligaba a cualquier módulo nuevo a
conseguirse un tema de tablero para montarla. Ahora sale de las variables --c-*,
que de paso es lo que la regla del style inline venía pidiendo.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

---

# Fase 2 — las vistas guardadas

### Task 2: ✅ HECHA (63ddb89) — La lógica pura — tercera capa y filtros ocultos

Antes de la tabla, las dos funciones puras que la van a usar. Van primero porque son lo único de esta fase que se puede probar sin base.

**Files:**
- Modify: `src/shared/utils/filters/defaults/index.ts`
- Modify: `src/shared/utils/filters/defaults/index.test.ts`
- Modify: `src/shared/utils/filters/defs/index.ts`
- Modify: `src/shared/utils/filters/defs/index.test.ts`
- Modify: `src/shared/utils/filters/index.ts`

**Interfaces:**
- Consumes: `FilterDef<T>`, `FilterValues`, `defaultFilterValues` (ya existen).
- Produces:

```ts
function resolveFilterValues<T>(defs: FilterDef<T>[], guardados: FilterValues, vista?: FilterValues): FilterValues
function visibleDefs<T>(defs: FilterDef<T>[], ocultos: string[]): FilterDef<T>[]
function sameFilters(a: FilterValues, b: FilterValues): boolean
```

Los consume la tarea 5.

- [ ] **Step 1: Escribir los tests que fallan**

En `src/shared/utils/filters/defaults/index.test.ts`, agregar dentro del `describe('resolveFilterValues', …)` que ya existe:

```ts
  // Las tres capas. La vista sólo interviene en la primera carga: elegir una del desplegable
  // ESCRIBE sus valores en el estado local, así que después lo que hay es lo que tocaste.
  it('la vista pisa a los defaults del código y lo tocado pisa a la vista', () => {
    expect(resolveFilterValues(DEFS, {}, { area: 'med' })).toEqual({ area: 'med' })
    expect(resolveFilterValues(DEFS, { area: 'ops' }, { area: 'med' })).toEqual({ area: 'ops' })
  })

  it('sin vista se comporta igual que antes', () => {
    expect(resolveFilterValues(DEFS, { area: 'ops' })).toEqual({ area: 'ops' })
  })

  // «Todas las áreas» guardado como cadena vacía sigue ganándole a la vista: si no, elegir «ver
  // todo» y recargar volvería a poner la vista, y no habría forma de salirse de ella.
  it('el vacío explícito le gana a la vista', () => {
    expect(resolveFilterValues(DEFS, { area: '' }, { area: 'med' })).toEqual({ area: '' })
  })
```

y, al final del mismo archivo, el bloque de la comparación:

```ts
describe('sameFilters', () => {
  it('el orden de las claves no cuenta', () => {
    expect(sameFilters({ area: 'mkt', estado: 'x' }, { estado: 'x', area: 'mkt' })).toBe(true)
  })

  // «Sin tocar» y «puesto en Todos» filtran igual, así que para saber si la pantalla todavía es
  // la vista guardada tienen que contar como lo mismo. Si no, aplicar una vista y no tocar nada
  // la marcaría como modificada apenas el motor rellene una clave con cadena vacía.
  it('la clave ausente y la cadena vacía son lo mismo', () => {
    expect(sameFilters({ area: 'mkt' }, { area: 'mkt', estado: '' })).toBe(true)
    expect(sameFilters({}, { area: '' })).toBe(true)
  })

  it('un valor distinto sí cuenta', () => {
    expect(sameFilters({ area: 'mkt' }, { area: 'med' })).toBe(false)
    expect(sameFilters({ area: 'mkt' }, {})).toBe(false)
  })
})
```

y sumar `sameFilters` al import de la primera línea del archivo.

En `src/shared/utils/filters/defs/index.test.ts`, agregar al final:

```ts
describe('visibleDefs', () => {
  it('saca los defs escondidos y respeta el orden de los que quedan', () => {
    expect(visibleDefs(DEFS, ['phase']).map(d => d.key)).toEqual(['country'])
    expect(visibleDefs(DEFS, []).map(d => d.key)).toEqual(['phase', 'country'])
  })

  // Se guarda lo OCULTO y no lo visible: así un filtro que el código agrega mañana aparece solo
  // en vez de nacer invisible para todo el que tenga una vista guardada de antes.
  it('una clave oculta que ya no existe no molesta', () => {
    expect(visibleDefs(DEFS, ['columna-que-se-borro']).map(d => d.key)).toEqual(['phase', 'country'])
  })
})
```

y sumar `visibleDefs` al import de la primera línea del archivo.

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
pnpm test src/shared/utils/filters/
```

Esperado: FAIL — `visibleDefs is not a function`, y las tres capas dan el valor de la capa equivocada.

- [ ] **Step 3: La tercera capa**

En `src/shared/utils/filters/defaults/index.ts`, reemplazar `resolveFilterValues` por:

```ts
// Los valores efectivos, en tres capas: lo que trae el código, lo que la persona guardó como su
// vista de apertura, y lo que tocó en esta sesión. Gana la de más a la derecha.
//
// La distinción entre «vacío» y «sin tocar» es todo el punto, y por eso `guardados` va último. Un
// filtro puesto en «Todos» guarda la cadena vacía, que NO es lo mismo que la clave ausente: sin
// esta diferencia, quitar un filtro y recargar la página darían resultados distintos —el default
// o la vista volverían solos— y no habría forma de ver la tabla completa.
//
// `vista` sólo pesa en la primera carga: elegir una vista del desplegable escribe sus valores en
// `guardados`, así que a partir de ahí las dos capas dicen lo mismo.
export function resolveFilterValues<T>(defs: FilterDef<T>[], guardados: FilterValues, vista?: FilterValues): FilterValues {
  return { ...defaultFilterValues(defs), ...vista, ...guardados }
}
```

- [ ] **Step 4: La comparación**

También en `src/shared/utils/filters/defaults/index.ts`, al final:

```ts
// ¿Estos dos conjuntos de filtros muestran lo mismo? Es lo que deja saber si la pantalla sigue
// siendo la vista que elegiste o si la tocaste encima — sin esto, el desplegable diría «Mi
// trimestre» mientras se ve otra cosa, que es peor que no tener la etiqueta.
//
// Una clave ausente y una clave en '' cuentan como IGUALES: las dos significan «este filtro no
// filtra». Sin esa equivalencia, aplicar una vista y no tocar nada la marcaría como modificada
// apenas el motor rellene una clave con cadena vacía.
export function sameFilters(a: FilterValues, b: FilterValues): boolean {
  const claves = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of claves) if ((a[k] ?? '') !== (b[k] ?? '')) return false
  return true
}
```

- [ ] **Step 5: Los defs visibles**

Al final de `src/shared/utils/filters/defs/index.ts`:

```ts
// Los defs que se muestran. Recibe lo OCULTO y no lo visible a propósito: guardar la excepción y
// no la regla es lo que hace que la lista pueda crecer. Con una lista de «visibles», un filtro
// agregado por el código mañana nacería invisible para todo el que tenga una vista guardada de
// antes, y nadie entendería por qué le falta.
export function visibleDefs<T>(defs: FilterDef<T>[], ocultos: string[]): FilterDef<T>[] {
  return defs.filter(d => !ocultos.includes(d.key))
}
```

**Un filtro escondido DEJA DE FILTRAR, y eso no es un detalle de implementación.** Lo que sale de
acá es lo que se le pasa a `applyFilters`, no sólo lo que se dibuja: si un filtro escondido
siguiera aplicándose, el tablero mostraría 40 de 267 tareas sin un solo control en pantalla que lo
explique — que es exactamente lo que el chip de «N activos» existe para evitar. Por eso todo
consumidor filtra con `filtros.visibles` y **nunca** con `filtros.defs`; `defs` es sólo para
dibujar el menú del picker.

El valor **no** se borra al esconder: queda en `valores` y vuelve intacto al mostrarlo de nuevo.
Esconder es reversible.

- [ ] **Step 6: Exportarlas por los dos barrels**

En `src/shared/utils/filters/index.ts`, las dos líneas de re-export:

```ts
export { applyFilters, distinctValues, distinctTokens, visibleDefs } from './defs'
export { defaultFilterValues, resolveFilterValues, sameFilters } from './defaults'
```

En `src/shared/utils/index.ts`, línea 15:

```ts
export { applyFilters, distinctValues, distinctTokens, visibleDefs, defaultFilterValues, resolveFilterValues, sameFilters } from './filters'
```

- [ ] **Step 7: Correr los tests y verificar que pasan**

```bash
pnpm test src/shared/utils/filters/ && pnpm typecheck
```

Esperado: PASS. `useTablero` sigue llamando a `resolveFilterValues` con dos argumentos y compila, porque el tercero es opcional.

- [ ] **Step 8: Commit**

```bash
git add src/shared/utils/filters/ src/shared/utils/index.ts
git commit -m "feat(filtros): tercera capa de resolución y defs ocultables

La vista guardada se mete entre los defaults del código y lo que tocaste; se
guarda lo OCULTO y no lo visible, para que un filtro nuevo del código aparezca
solo en vez de nacer invisible para quien tenga una vista vieja.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

---

### Task 3: La tabla `vistas_filtro`

**Files:**
- Create: `supabase/migrations/<timestamp>_vistas_filtro.sql`
- Create: `supabase/rollback/vistas-filtro-rollback.sql`

**Interfaces:**
- Consumes: `public.usuarios(id)`, `usuarios.auth_id`, `auth.uid()`.
- Produces: la tabla `public.vistas_filtro` con RLS encendida. La consume la tarea 4.

- [ ] **Step 1: Crear el archivo de migración**

```bash
pnpm supabase migration new vistas_filtro
```

- [ ] **Step 2: Escribir la migración**

En el archivo que acaba de crear la CLI:

```sql
-- Vistas de filtro guardadas: una combinación de filtros CON NOMBRE, por persona y por tabla.
--
-- Por qué una tabla y no localStorage, que es donde ya viven los filtros. `useUserPreference` es
-- localStorage namespaceado por usuario, y está bien para lo que hace: recordar qué filtro tenés
-- puesto, qué pestaña mirabas, qué panel dejaste recogido — estado de UI que se pierde y no pasa
-- nada. Una vista guardada no es eso: es un artefacto que la persona creó y nombró. Perderlo al
-- limpiar la caché, o no encontrarlo al entrar desde otra máquina, es un bug.
--
-- Lo que NO viene acá: los valores que están puestos ahora mismo. Cambian con cada tecla y
-- escribirlos a la base sería un round-trip por interacción. Esta tabla se toca sólo al guardar,
-- al cargar y al borrar una vista.
--
-- Diseño: docs/superpowers/specs/2026-09-04-filtros-reutilizables-design.md
-- Rollback: supabase/rollback/vistas-filtro-rollback.sql

BEGIN;

CREATE TABLE public.vistas_filtro (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  -- ON DELETE CASCADE, al revés que las FK de `actividades`, que son SET NULL. Una actividad sin
  -- creador sigue siendo una actividad; una vista sin dueño es basura que nadie puede ver ni
  -- borrar, porque la RLS de abajo corta justamente por `usuario_id`.
  usuario_id        uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  -- Qué tabla filtra: 'tasks', 'research', … Es text y no un DOMAIN con CHECK a propósito: la
  -- lista crece con cada módulo que adopte el motor, y un CHECK obligaría a una migración por
  -- módulo. La fuente única del valor es la constante de TypeScript; el peor caso de un typo es
  -- que tu vista no aparezca, no un agujero de acceso.
  ambito            text NOT NULL,
  nombre            text NOT NULL,
  valores           jsonb   NOT NULL DEFAULT '{}'::jsonb,
  -- Las claves de def que la persona escondió. Se guarda lo OCULTO y no lo visible: con una
  -- lista de visibles, un filtro agregado por el código mañana nacería invisible para todo el
  -- que tenga una vista vieja.
  ocultos           text[]  NOT NULL DEFAULT '{}',
  abre_por_defecto  boolean NOT NULL DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  CONSTRAINT vista_nombre_unico UNIQUE (usuario_id, ambito, nombre),
  CONSTRAINT vista_nombre_no_vacio CHECK (btrim(nombre) <> '')
);

ALTER TABLE public.vistas_filtro ENABLE ROW LEVEL SECURITY;

CREATE INDEX ON public.vistas_filtro (usuario_id, ambito);

-- UNA sola vista de apertura por persona y ámbito. Parcial y no un constraint: sin el WHERE,
-- `false` colisionaría consigo mismo y no se podría tener dos vistas sin marcar.
CREATE UNIQUE INDEX vista_default_unica
  ON public.vistas_filtro (usuario_id, ambito) WHERE abre_por_defecto;

-- Cada quien ve y escribe lo suyo, y nada más. Sin gate de módulo a propósito: una vista no
-- contiene datos del negocio —sólo claves de filtro y texto que la propia persona tipeó—, y
-- gatearla por módulo dejaría vistas huérfanas que nadie podría limpiar el día que alguien
-- pierde un módulo.
CREATE POLICY "vistas_filtro_propias" ON public.vistas_filtro FOR ALL
  USING      (usuario_id IN (SELECT u.id FROM public.usuarios u WHERE u.auth_id = auth.uid()))
  WITH CHECK (usuario_id IN (SELECT u.id FROM public.usuarios u WHERE u.auth_id = auth.uid()));

-- Defensa en profundidad, igual que 20260831214348_revocar_anon_vistas.sql: la policy ya deja
-- a `anon` sin filas (auth.uid() es NULL), pero el GRANT es lo que se lee en una auditoría.
REVOKE ALL ON public.vistas_filtro FROM anon;

COMMENT ON TABLE public.vistas_filtro IS
  'Combinaciones de filtros guardadas con nombre, por usuario y por tabla (`ambito`). NO es el '
  'estado vivo de los filtros: eso sigue en localStorage vía useUserPreference. Se toca sólo al '
  'guardar, cargar o borrar una vista.';

COMMIT;
```

- [ ] **Step 3: Escribir el rollback**

`supabase/rollback/vistas-filtro-rollback.sql`:

```sql
-- Deshace 20260904…_vistas_filtro.sql. La tabla es nueva y no la referencia nadie, así que
-- alcanza con soltarla: la policy, los índices y el REVOKE se van con ella.
--
-- Lo que NO se puede deshacer: las vistas que la gente haya guardado. Antes de correr esto,
-- `pg_dump --data-only -t public.vistas_filtro` si hay filas que valga la pena conservar.
DROP TABLE IF EXISTS public.vistas_filtro;
```

- [ ] **Step 4: Aplicarla en local**

```bash
pnpm supabase migration up
```

Esperado: aplica sin error. **`supabase db reset` está prohibido en este repo** — el `config.toml` apunta a un `seed.sql` inexistente y un reset borra los datos de prueba sin que ningún seed los restaure.

- [ ] **Step 5: Verificar que la RLS está ENCENDIDA, no sólo escrita**

Ver una policy no es ver control de acceso: el 29/08/2026 cuatro tablas tenían sus policies escritas y `relrowsecurity = false`.

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname = 'vistas_filtro';"
```

Esperado: `vistas_filtro | t`.

Y el guard del repo, que además prueba consultando como `anon` en vez de leer el esquema:

```bash
pnpm db:rls
```

Esperado: verde.

- [ ] **Step 6: Verificar el índice parcial**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select indexname from pg_indexes where tablename = 'vistas_filtro';"
```

Esperado: aparece `vista_default_unica` junto al de la PK, el UNIQUE del nombre y el de `(usuario_id, ambito)`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/ supabase/rollback/vistas-filtro-rollback.sql
git commit -m "feat(filtros): la tabla vistas_filtro

Una combinación de filtros con nombre es un artefacto que la persona creó:
perderlo al limpiar la caché es un bug, no una molestia. El estado vivo de los
filtros se queda en localStorage, que es donde corresponde.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

---

### Task 4: La capa de datos

**Files:**
- Modify: `src/shared/data/tables.ts`
- Create: `src/shared/data/vistas-filtro.ts`
- Modify: `src/shared/data/index.ts`

**Interfaces:**
- Consumes: `supabase` de `@/shared/db/supabase`, `TABLES`, `FilterValues`.
- Produces: el namespace `vistasFiltroRepo` con `list`, `create`, `update`, `remove`, `marcarPorDefecto`, y el tipo `VistaFiltro`. Los consume la tarea 5.

- [ ] **Step 1: La constante de la tabla**

En `src/shared/data/tables.ts`, dentro de `TABLES`, después de `reunionParticipantes`:

```ts
  vistasFiltro: 'vistas_filtro',
```

- [ ] **Step 2: El repo**

`src/shared/data/vistas-filtro.ts`:

```ts
import { supabase } from '@/shared/db/supabase'
import { TABLES } from './tables'
import type { FilterValues } from '@/shared/utils'

// Capa de acceso a `vistas_filtro`: las combinaciones de filtros que cada persona guardó con
// nombre. NINGUNA de estas funciones filtra por `usuario_id` al leer — lo hace la RLS, y pedirlo
// de nuevo acá sería una segunda fuente de verdad sobre quién ve qué, de esas que se
// desincronizan el día que una cambia.
export type VistaFiltro = {
  id: string
  ambito: string
  nombre: string
  valores: FilterValues
  ocultos: string[]
  abre_por_defecto: boolean
}

export const list = (ambito: string) =>
  supabase.from(TABLES.vistasFiltro).select('*').eq('ambito', ambito).order('nombre')

export const create = (payload: Omit<VistaFiltro, 'id'> & { usuario_id: string }) =>
  supabase.from(TABLES.vistasFiltro).insert(payload).select().single()

// `.select().single()` convierte "0 filas afectadas" (otra pestaña ya la borró) en error, en vez
// de un ok fantasma que resucite la vista en el estado local. Mismo criterio que `actividades`.
export const update = (id: string, payload: Partial<Omit<VistaFiltro, 'id'>>) =>
  supabase.from(TABLES.vistasFiltro)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()

export const remove = (id: string) =>
  supabase.from(TABLES.vistasFiltro).delete().eq('id', id)

// Cuál abre por defecto. Van DOS sentencias y no una: el índice único parcial se valida fila por
// fila en el momento, no al final de la transacción, así que encender la nueva antes de apagar
// la vieja choca contra `vista_default_unica`.
export const marcarPorDefecto = async (usuarioId: string, ambito: string, id: string) => {
  await supabase.from(TABLES.vistasFiltro).update({ abre_por_defecto: false })
    .eq('usuario_id', usuarioId).eq('ambito', ambito).eq('abre_por_defecto', true)
  return update(id, { abre_por_defecto: true })
}
```

- [ ] **Step 3: El barrel**

En `src/shared/data/index.ts`, al final:

```ts
export * as vistasFiltroRepo from './vistas-filtro'
export type { VistaFiltro } from './vistas-filtro'
```

El tipo se re-exporta acá y no se importa por su ruta desde afuera: la regla del barrel vale también para los tipos.

- [ ] **Step 4: Verificar que compila**

```bash
pnpm typecheck && pnpm lint
```

Esperado: PASS. No hay test unitario: es una capa de llamadas a Supabase, sin lógica propia salvo el orden de las dos sentencias de `marcarPorDefecto`, que se verifica de verdad en la tarea 7 (paso del navegador).

- [ ] **Step 5: Commit**

```bash
git add src/shared/data/
git commit -m "feat(filtros): repo de vistas_filtro

Ninguna función filtra por usuario_id al leer: lo hace la RLS. Pedirlo también
acá sería una segunda fuente de verdad sobre quién ve qué.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

---

# Fase 3 — la pieza

### Task 5: `useFilters` — el estado, las vistas y el contrato

Es la bisagra: junta la mitad efímera (localStorage) con la mitad guardada (la tabla) y expone un solo contrato que cualquier módulo puede consumir.

Va en **dos archivos** porque uno solo pasa el techo de 50 líneas: el CRUD contra el repo tiene su propia responsabilidad y su propio manejo de error.

**Files:**
- Create: `src/shared/hooks/useFilters/tipos.ts`
- Create: `src/shared/hooks/useFilters/vistas.ts`
- Create: `src/shared/hooks/useFilters/index.ts`
- Modify: `src/shared/hooks/index.ts`

**Interfaces:**
- Consumes: `useApp().usuario`, `useUserPreference`, `resolveFilterValues`, `defaultFilterValues`, `visibleDefs`, `vistasFiltroRepo`, `VistaFiltro`.
- Produces: el tipo `Filtros<T>` y las funciones `useVistas(ambito)` / `useFilters(ambito, defs)`. Los consume la tarea 7.

- [ ] **Step 1: El contrato, escrito a mano**

`src/shared/hooks/useFilters/tipos.ts`:

```ts
import type { FilterDef, FilterValues } from '@/shared/utils'
import type { VistaFiltro } from '@/shared/data'

// El contrato de `useFilters`, escrito y no inferido. Se escribe por dos razones: es lo que
// `FiltersPanel` recibe por props —y `ReturnType<typeof useFilters<T>>` no es sintaxis válida
// para una función genérica—, y porque un contrato de trece campos merece leerse de un vistazo
// en vez de reconstruirse siguiendo el `return` de un hook.
export type Filtros<T> = {
  defs: FilterDef<T>[]      // TODOS, para el menú de qué filtros ver
  visibles: FilterDef<T>[]  // los que se dibujan y los que filtran
  valores: FilterValues
  ocultos: string[]
  vistas: VistaFiltro[]
  activos: number
  // Cuál está aplicada y si la tocaste encima. Las dos hacen falta para que el desplegable no
  // mienta: sin `vistaActivaId` no sabe qué mostrar seleccionado después de un F5, y sin
  // `modificada` diría «Mi trimestre» mientras en pantalla hay otra cosa.
  vistaActivaId: string
  modificada: boolean
  setValor: (key: string, value: string) => void
  limpiar: () => void
  alternarVisible: (key: string) => void
  aplicarVista: (id: string) => void
  guardarVista: (nombre: string) => Promise<void>
  // Pisa una vista existente con lo que hay en pantalla. Sin esto, conservar un retoque obliga a
  // borrar la vista y volver a guardarla con el mismo nombre.
  actualizarVista: (id: string) => Promise<void>
  borrarVista: (id: string) => Promise<void>
  marcarPorDefecto: (id: string) => Promise<void>
}
```

- [ ] **Step 2: El CRUD de vistas**

`src/shared/hooks/useFilters/vistas.ts`:

```ts
'use client'
import { useCallback, useEffect, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { vistasFiltroRepo, type VistaFiltro } from '@/shared/data'
import type { FilterValues } from '@/shared/utils'

// Las vistas guardadas de UN ámbito. Se leen una vez al montar y se releen tras cada escritura:
// son pocas por persona (unidades, no cientos) y el costo de un refetch es menor que el de
// mantener una copia local sincronizada a mano y verla derivar.
export function useVistas(ambito: string) {
  const { usuario } = useApp()
  const [vistas, setVistas] = useState<VistaFiltro[]>([])

  const recargar = useCallback(async () => {
    const { data } = await vistasFiltroRepo.list(ambito)
    setVistas(data ?? [])
  }, [ambito])

  useEffect(() => { void recargar() }, [recargar])

  const guardar = async (nombre: string, valores: FilterValues, ocultos: string[]) => {
    if (!usuario?.id) return
    await vistasFiltroRepo.create({ usuario_id: usuario.id, ambito, nombre, valores, ocultos, abre_por_defecto: false })
    await recargar()
  }
  const actualizar = async (id: string, valores: FilterValues, ocultos: string[]) => {
    await vistasFiltroRepo.update(id, { valores, ocultos })
    await recargar()
  }
  const borrar = async (id: string) => { await vistasFiltroRepo.remove(id); await recargar() }
  const marcarPorDefecto = async (id: string) => {
    if (!usuario?.id) return
    await vistasFiltroRepo.marcarPorDefecto(usuario.id, ambito, id)
    await recargar()
  }

  const api = { vistas, guardar, actualizar, borrar, marcarPorDefecto }
  return api
}
```

- [ ] **Step 3: El hook principal**

`src/shared/hooks/useFilters/index.ts`:

```ts
'use client'
import { useMemo } from 'react'
// `../useUserPreference` y NO `@/shared/hooks`: este archivo lo re-exporta el barrel de hooks, y
// entrar por el barrel cerraría un ciclo. Mismo criterio que documenta `shared/utils/index.ts`.
import { useUserPreference } from '../useUserPreference'
import { resolveFilterValues, defaultFilterValues, visibleDefs, sameFilters, type FilterDef, type FilterValues } from '@/shared/utils'
import type { Filtros } from './tipos'
import { useVistas } from './vistas'

// El estado EFÍMERO: qué tenés puesto ahora, qué escondiste ahora, y sobre qué vista estás
// parado. Va a localStorage y no a la tabla porque cambia con cada tecla; escribirlo a la base
// sería un round-trip por interacción.
//
// `vistaId` viaja acá y no en un useState del componente para que sobreviva a un F5: si no, al
// recargar el desplegable volvería a «Sin vista» aunque en pantalla estén los filtros de una.
type EstadoLocal = { valores: FilterValues; ocultos: string[]; vistaId: string }
const VACIO: EstadoLocal = { valores: {}, ocultos: [], vistaId: '' }

// Los filtros de una tabla: el motor, el estado vivo y las vistas guardadas, en un contrato.
// `ambito` identifica qué tabla se filtra ('tasks', 'research', …) y separa tanto la clave de
// localStorage como las filas de `vistas_filtro`.
export function useFilters<T>(ambito: string, defs: FilterDef<T>[]): Filtros<T> {
  const [local, setLocal] = useUserPreference<EstadoLocal>(`filtros:${ambito}`, VACIO)
  const { vistas, guardar, actualizar, borrar, marcarPorDefecto } = useVistas(ambito)

  // La vista de apertura es la TERCERA capa, debajo de lo que tocaste: pesa en la primera carga
  // y deja de pesar en cuanto tocás algo, porque `local.valores` la pisa clave por clave.
  const apertura = vistas.find(v => v.abre_por_defecto)
  const valores = useMemo(
    () => resolveFilterValues(defs, local.valores, apertura?.valores), [defs, local.valores, apertura])
  const ocultos = local.ocultos.length ? local.ocultos : apertura?.ocultos ?? []
  const visibles = useMemo(() => visibleDefs(defs, ocultos), [defs, ocultos])

  const setValor = (key: string, value: string) =>
    setLocal(p => ({ ...p, valores: { ...p.valores, [key]: value } }))
  // Limpiar vuelve a la vista de apertura si hay una, y a los defaults del código si no. Nunca a
  // vacío: si volviera a vacío, «limpiar» y «recargar» dejarían la pantalla en dos estados.
  const limpiar = () =>
    setLocal(p => ({ ...p, valores: apertura?.valores ?? defaultFilterValues(defs) }))
  const alternarVisible = (key: string) => setLocal(p => ({
    ...p,
    ocultos: p.ocultos.includes(key) ? p.ocultos.filter(k => k !== key) : [...p.ocultos, key],
  }))
  // Elegir una vista ESCRIBE su contenido en el estado local. Por eso `apertura` sólo importa en
  // la primera carga: a partir de acá, lo que hay es lo que elegiste.
  const aplicarVista = (id: string) => {
    const v = vistas.find(x => x.id === id)
    setLocal(v ? { valores: v.valores, ocultos: v.ocultos, vistaId: v.id } : VACIO)
  }

  // Si la vista aplicada ya no coincide con lo que hay en pantalla, el desplegable lo dice. Los
  // `ocultos` se comparan como conjuntos: el orden en que escondiste dos filtros no es un cambio.
  const activa = vistas.find(v => v.id === local.vistaId)
  const modificada = !!activa && !(
    sameFilters(valores, activa.valores) &&
    ocultos.length === activa.ocultos.length && ocultos.every(k => activa.ocultos.includes(k))
  )

  const filtros: Filtros<T> = {
    defs, visibles, valores, ocultos, vistas,
    activos: visibles.filter(d => valores[d.key]).length,
    vistaActivaId: activa?.id ?? '',
    modificada,
    setValor, limpiar, alternarVisible, aplicarVista,
    guardarVista: (nombre: string) => guardar(nombre, valores, ocultos),
    actualizarVista: (id: string) => actualizar(id, valores, ocultos),
    borrarVista: borrar,
    marcarPorDefecto,
  }
  return filtros
}
```

**`vistaActivaId` sale de `activa?.id` y no de `local.vistaId`** a propósito: si la vista se borró
desde otra pestaña, el id guardado apunta a algo que ya no está y el `<select>` quedaría con un
valor que no existe entre sus opciones — que en HTML se dibuja en blanco, sin explicación.

- [ ] **Step 4: El barrel de hooks**

En `src/shared/hooks/index.ts`, al final:

```ts
export { useFilters } from './useFilters'
export type { Filtros } from './useFilters/tipos'
```

`useVistas` **no** se exporta: es interno del hook, y sacarlo al barrel invitaría a montar el CRUD sin el estado.

- [ ] **Step 5: Verificar que compila**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Esperado: PASS. No hay test de este archivo: es un hook de React y el repo no tiene entorno DOM en Vitest. Lo testeable ya está probado en la tarea 2 (`resolveFilterValues`, `visibleDefs`); lo de acá es cableado, y se verifica en la tarea 7.

- [ ] **Step 6: Commit**

```bash
git add src/shared/hooks/
git commit -m "feat(filtros): useFilters junta el estado vivo con las vistas guardadas

Lo efímero (qué tenés puesto) sigue en localStorage; lo guardado (una vista con
nombre) sale de la tabla. Elegir una vista escribe sus valores en el estado
local, así que la capa de vista sólo pesa en la primera carga.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

---

### Task 6: El «+ Filtro» y el desplegable de vistas

Dos componentes chicos y tontos: reciben todo por props y no saben de dónde salen. Los dos usan `<details>` nativo en vez de un menú con estado — es teclado-accesible de fábrica, cierra solo con Escape y no necesita una librería ni un `useState` más.

**Files:**
- Create: `src/shared/components/filters/FilterPicker/index.tsx`
- Create: `src/shared/components/filters/FilterPicker/index.module.css`
- Create: `src/shared/components/filters/FilterPresets/index.tsx`
- Create: `src/shared/components/filters/FilterPresets/index.module.css`
- Modify: `src/shared/i18n/locales/es.json`
- Modify: `src/shared/i18n/locales/en.json`

**Interfaces:**
- Consumes: `FilterDef<T>`, `VistaFiltro`, `useT`.
- Produces: los dos componentes default. Los consume la tarea 7.

- [ ] **Step 1: Las claves de i18n**

En `src/shared/i18n/locales/es.json`, junto a las demás `common.*`:

```json
  "common.filter.section": "Filtros",
  "common.filter.clear": "Limpiar",
  "common.filter.activeCount": "{n} activo(s)",
  "common.filter.pick": "+ Filtro",
  "common.filter.views": "Vistas",
  "common.filter.viewsNone": "Sin vista",
  "common.filter.save": "Guardar vista",
  "common.filter.saveName": "Nombre de la vista",
  "common.filter.saveDo": "Guardar",
  "common.filter.modified": "• modificada",
  "common.filter.update": "Actualizar",
  "common.filter.delete": "Borrar",
  "common.filter.setDefault": "Abrir con esta",
```

En `en.json`, las mismas claves:

```json
  "common.filter.section": "Filters",
  "common.filter.clear": "Clear",
  "common.filter.activeCount": "{n} active",
  "common.filter.pick": "+ Filter",
  "common.filter.views": "Views",
  "common.filter.viewsNone": "No view",
  "common.filter.save": "Save view",
  "common.filter.saveName": "View name",
  "common.filter.saveDo": "Save",
  "common.filter.modified": "• modified",
  "common.filter.update": "Update",
  "common.filter.delete": "Delete",
  "common.filter.setDefault": "Open with this one",
```

- [ ] **Step 2: El picker**

`src/shared/components/filters/FilterPicker/index.tsx`:

```tsx
'use client'
import { useT } from '@/shared/i18n'
import type { FilterDef } from '@/shared/utils'
import s from './index.module.css'

// Qué filtros se muestran. Es un `<details>` nativo y no un menú con estado: cierra con Escape,
// funciona con teclado sin ARIA a mano y no agrega una dependencia ni un useState.
//
// Los checkboxes están marcados cuando el filtro SE VE. Lo que se guarda es lo contrario —la
// lista de ocultos— y esa asimetría es deliberada: ver `visibleDefs`.
export default function FilterPicker<T>({ defs, ocultos, onAlternar, labelFor }: {
  defs: FilterDef<T>[]
  ocultos: string[]
  onAlternar: (key: string) => void
  labelFor: (def: FilterDef<T>) => string
}) {
  const { t } = useT()
  return (
    <details className={s.picker}>
      <summary className={s.summary}>{t('common.filter.pick')}</summary>
      <div className={s.menu}>
        {defs.map(d => (
          <label key={d.key} className={s.item}>
            <input type="checkbox" checked={!ocultos.includes(d.key)} onChange={() => onAlternar(d.key)} />
            {labelFor(d)}
          </label>
        ))}
      </div>
    </details>
  )
}
```

`src/shared/components/filters/FilterPicker/index.module.css`:

```css
.picker { position: relative; }

.summary {
  list-style: none;
  cursor: pointer;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px dashed var(--c-border-strong);
  color: var(--c-t2);
  font-size: 0.6875rem;
}
.summary::-webkit-details-marker { display: none; }

.menu {
  position: absolute;
  z-index: 10;
  margin-top: 0.25rem;
  min-width: 12rem;
  padding: 0.5rem;
  border-radius: 0.625rem;
  border: 1px solid var(--c-border);
  background: var(--c-s1);
  box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 12%);
}

.item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.375rem;
  font-size: 0.75rem;
  color: var(--c-t1);
  cursor: pointer;
}
```

- [ ] **Step 3: El selector de vistas**

`src/shared/components/filters/FilterPresets/index.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import type { VistaFiltro } from '@/shared/data'
import s from './index.module.css'

// Las vistas guardadas: elegir una, guardar la combinación actual como una nueva, borrar, y
// marcar cuál abre. El formulario de guardar va en un `<details>` y NO en un `prompt()`: un
// modal del navegador bloquea todo el hilo y no se puede traducir ni testear.
export default function FilterPresets({ vistas, activaId, modificada, onAplicar, onGuardar, onActualizar, onBorrar, onMarcar }: {
  vistas: VistaFiltro[]
  activaId: string
  modificada: boolean
  onAplicar: (id: string) => void
  onGuardar: (nombre: string) => Promise<void>
  onActualizar: (id: string) => Promise<void>
  onBorrar: (id: string) => Promise<void>
  onMarcar: (id: string) => Promise<void>
}) {
  const { t } = useT()
  const [nombre, setNombre] = useState('')

  // Cuál está elegida NO es estado de este componente: viene de `useFilters`, que lo persiste.
  // Con un useState local, recargar la página dejaba el desplegable en «Sin vista» mientras en
  // pantalla seguían los filtros de una.
  const guardar = async () => {
    const limpio = nombre.trim()
    if (!limpio) return
    await onGuardar(limpio)
    setNombre('')
  }

  return (
    <div className={s.presets}>
      <select className={s.select} value={activaId} onChange={e => onAplicar(e.target.value)}>
        <option value="">{t('common.filter.viewsNone')}</option>
        {vistas.map(v => <option key={v.id} value={v.id}>{v.abre_por_defecto ? `★ ${v.nombre}` : v.nombre}</option>)}
      </select>

      {activaId && (
        <>
          {/* Lo que hay en pantalla ya no es la vista. Se dice, y se ofrece pisarla. */}
          {modificada && (
            <>
              <span className={s.modificada}>{t('common.filter.modified')}</span>
              <button className={s.accion} onClick={() => void onActualizar(activaId)}>{t('common.filter.update')}</button>
            </>
          )}
          <button className={s.accion} onClick={() => void onMarcar(activaId)}>{t('common.filter.setDefault')}</button>
          <button className={s.accion} onClick={() => void onBorrar(activaId)}>{t('common.filter.delete')}</button>
        </>
      )}

      <details className={s.guardar}>
        <summary className={s.summary}>{t('common.filter.save')}</summary>
        <div className={s.form}>
          <input className={s.input} value={nombre} placeholder={t('common.filter.saveName')}
            onChange={e => setNombre(e.target.value)} />
          <button className={s.accion} onClick={() => void guardar()}>{t('common.filter.saveDo')}</button>
        </div>
      </details>
    </div>
  )
}
```

`src/shared/components/filters/FilterPresets/index.module.css`:

```css
.presets {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.select {
  padding: 0.375rem 0.75rem;
  border-radius: 0.625rem;
  border: 1px solid var(--c-border-strong);
  background: var(--c-s1);
  color: var(--c-t1);
  font-size: 0.75rem;
}

.accion {
  padding: 0.375rem 0.625rem;
  border-radius: 0.5rem;
  border: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-t2);
  font-size: 0.6875rem;
  cursor: pointer;
}

/* La marca de "esto ya no es la vista". Va en el acento y no en rojo: no es un error, es un
   estado — le estás agregando algo a una vista guardada, que es lo normal. */
.modificada {
  font-family: 'DM Mono', monospace;
  font-size: 0.625rem;
  color: var(--c-accent);
}

.guardar { position: relative; }

.summary {
  list-style: none;
  cursor: pointer;
  padding: 0.375rem 0.625rem;
  border-radius: 0.5rem;
  border: 1px solid var(--c-border);
  color: var(--c-t2);
  font-size: 0.6875rem;
}
.summary::-webkit-details-marker { display: none; }

.form {
  position: absolute;
  z-index: 10;
  display: flex;
  gap: 0.375rem;
  margin-top: 0.25rem;
  padding: 0.5rem;
  border-radius: 0.625rem;
  border: 1px solid var(--c-border);
  background: var(--c-s1);
  box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 12%);
}

.input {
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--c-border-strong);
  background: var(--c-s1);
  color: var(--c-t1);
  font-size: 0.75rem;
}
```

- [ ] **Step 4: Verificar**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Esperado: PASS. Los componentes todavía no los monta nadie — eso es la tarea 7.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/filters/FilterPicker/ src/shared/components/filters/FilterPresets/ src/shared/i18n/locales/
git commit -m "feat(filtros): el menú de filtros visibles y el selector de vistas

Los dos con <details> nativo: teclado y Escape gratis, sin librería ni estado de
apertura. El formulario de guardar es un input inline y no un prompt(), que
bloquea el hilo y no se puede traducir.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

---

### Task 7: `FiltersPanel` y la mudanza de los dos módulos

El armador, y la prueba de que la pieza viaja: los dos paneles de filtros que hoy están duplicados —uno en Stratix y otro en Research, con el mismo `Panel collapsible`, el mismo chip de «activos» y la misma llamada a `FilterBar`— se borran y quedan reemplazados por uno.

**El estado NO vive en `FiltersPanel`.** Vive en el hook del módulo, porque el tablero de `/tasks` necesita leer `actsFiltradas` para sus KPIs y sus gráficas. `FiltersPanel` es un presentador: recibe el retorno de `useFilters` y lo dibuja.

**Files:**
- Create: `src/shared/components/filters/FiltersPanel/index.tsx`
- Create: `src/shared/components/filters/FiltersPanel/index.module.css`
- Modify: `src/features/tasks/hooks/useTablero/filtros.ts`
- Modify: `src/features/tasks/components/overview/OverviewTab/index.tsx`
- Delete: `src/features/tasks/components/overview/StratixFiltersPanel/`
- Modify: `src/features/research/hooks/useResearchData.ts:9-10,32,59-61,67,250`
- Modify: `src/features/research/components/DashboardTab.tsx:10,36`
- Modify: `src/features/research/components/leads/LeadsTab.tsx:7,31`
- Delete: `src/features/research/components/FiltersPanel.tsx`

**Interfaces:**
- Consumes: `Filtros<T>` y `useFilters` (tarea 5), `FilterBar` (tarea 1), `FilterPicker` y `FilterPresets` (tarea 6), `Panel` de `@/shared/components/dashboard/Panel`.
- Produces: `FiltersPanel`, montado por los dos módulos. Nadie más lo consume todavía.

- [ ] **Step 1: El armador**

`src/shared/components/filters/FiltersPanel/index.tsx`:

```tsx
'use client'
import { useT, type I18nKey } from '@/shared/i18n'
import Panel from '@/shared/components/dashboard/Panel'
import FilterBar from '@/shared/components/filters/FilterBar'
import FilterPicker from '@/shared/components/filters/FilterPicker'
import FilterPresets from '@/shared/components/filters/FilterPresets'
import type { Filtros } from '@/shared/hooks'
import s from './index.module.css'

// El panel de filtros completo: vistas guardadas, la barra y el menú de qué filtros ver. Existía
// dos veces —`StratixFiltersPanel` y el `FiltersPanel` de Research— con el mismo Panel, el mismo
// chip y la misma llamada a FilterBar; las dos copias se borraron por esta.
//
// El estado NO vive acá: llega entero desde `useFilters`, que el módulo llama en su propio hook.
// Tiene que ser así porque el tablero de /tasks lee el conjunto filtrado para sus KPIs y sus
// gráficas — si el estado viviera en este componente, el tablero no podría verlo.
//
// El conteo de activos va en la CABECERA del panel a propósito: los filtros se recuerdan entre
// sesiones y el panel se puede dejar recogido, así que ese chip es lo ÚNICO que explica por qué
// las cifras de abajo no son las de todo el año.
export default function FiltersPanel<T>({ filtros, items, persistKey }: {
  filtros: Filtros<T>
  items: T[]
  persistKey: string
}) {
  const { t } = useT()
  const labelFor = (d: { labelKey: string }) => t(d.labelKey as I18nKey)
  return (
    <Panel collapsible persistKey={persistKey} title={t('common.filter.section')}
      right={filtros.activos > 0
        ? <span className={s.chip}>{t('common.filter.activeCount', { n: filtros.activos })}</span>
        : undefined}>
      <FilterPresets vistas={filtros.vistas} activaId={filtros.vistaActivaId} modificada={filtros.modificada}
        onAplicar={filtros.aplicarVista} onGuardar={filtros.guardarVista} onActualizar={filtros.actualizarVista}
        onBorrar={filtros.borrarVista} onMarcar={filtros.marcarPorDefecto} />
      <div className={s.fila}>
        {/* `items` son TODOS y no los filtrados: las opciones de cada desplegable salen del
            total, si no, al elegir una marca desaparecerían las demás y no se podría cambiar
            sin limpiar primero. */}
        <FilterBar defs={filtros.visibles} items={items} values={filtros.valores}
          onChange={filtros.setValor} onClear={filtros.limpiar}
          labelFor={labelFor} clearLabel={t('common.filter.clear')} resultsLabel="" />
        <FilterPicker defs={filtros.defs} ocultos={filtros.ocultos}
          onAlternar={filtros.alternarVisible} labelFor={labelFor} />
      </div>
    </Panel>
  )
}
```

`src/shared/components/filters/FiltersPanel/index.module.css`:

```css
/* El chip de "activos: N" de la cabecera: acento sobre su propio fondo al 8%, para que se lea
   como un aviso y no como un botón. */
.chip {
  font-family: 'DM Mono', monospace;
  font-size: 0.625rem;
  color: var(--c-accent);
  background: color-mix(in srgb, var(--c-accent) 8%, transparent);
  border-radius: 999px;
  padding: 0.25rem 0.625rem;
}

/* El picker va al final de la misma fila que la barra, no debajo: es un control más de la barra,
   y bajarlo a su propio renglón lo lee como una sección aparte. */
.fila {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  flex-wrap: wrap;
}
```

- [ ] **Step 2: `/tasks` pasa a `useFilters`**

En `src/features/tasks/hooks/useTablero/filtros.ts`, el cuerpo del hook se reduce: la parte de
`useUserPreference` + `resolveFilterValues` + `defaultFilterValues` se va entera y la reemplaza
una llamada. Lo que **queda** es la derivación de los tres mapas del área, que es propia del
módulo:

```ts
'use client'
import { useMemo } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useFilters } from '@/shared/hooks'
import { actividadFilters } from '@/features/tasks/utils/act-filters'
import { departamentoPorUsuario } from '@/features/tasks/utils/departamento'

// Los filtros del tablero. La mecánica —valores, vistas guardadas, qué se ve— es la compartida;
// lo propio del módulo son los tres mapas del área, que salen de los catálogos de organización.
export function useFiltrosTablero() {
  const { usuario, usuarios, equipos, departamentos, miembrosPorId } = useApp()
  const { t, intlLocale } = useT()

  const departamentoPorResponsable = useMemo(
    () => departamentoPorUsuario(usuarios, equipos), [usuarios, equipos])
  const nombreDepartamento = useMemo(
    () => Object.fromEntries(departamentos.map(d => [d.id, d.nombre])), [departamentos])
  const departamentoPropio = usuario?.id ? departamentoPorResponsable[usuario.id] : undefined

  // `actFilters` va memoizado y NO es opcional: sin esto se recrea en cada render, y como es la
  // entrada de `useFilters` y de los seis `applyFilters` del tablero, arrastra a todos.
  const actFilters = useMemo(() => actividadFilters({
    t, nombrePorId: miembrosPorId, intlLocale,
    departamentoPorResponsable, nombreDepartamento, departamentoPropio,
  }), [t, miembrosPorId, intlLocale, departamentoPorResponsable, nombreDepartamento, departamentoPropio])

  return useFilters('tasks', actFilters)
}
```

- [ ] **Step 3: `useTablero` lee el contrato nuevo**

En `src/features/tasks/hooks/useTablero/index.ts`, los nombres cambian (`filterValues` → `valores`, `actFilters` → `visibles` para filtrar, `defs` para el picker). El bloque de arriba queda:

```ts
  const filtros = useFiltrosTablero()
  const actsFiltradas = useMemo(
    () => applyFilters(actividades, filtros.visibles, filtros.valores), [actividades, filtros])
```

y `exceptOwn`:

```ts
  const exceptOwn = (key: string) =>
    applyFilters(actividades, filtros.visibles.filter(d => d.key !== key), filtros.valores)
```

En el objeto `tablero` del final, los cinco campos sueltos de filtro (`actFilters, filterValues, setFilterValue, clearFilters, filtrosActivos`) se reemplazan por uno: `filtros`. Y `anioGrafica` pasa a leer `filtros.valores.periodo`.

- [ ] **Step 4: `OverviewTab` monta el panel compartido**

En `src/features/tasks/components/overview/OverviewTab/index.tsx`, reemplazar el `<StratixFiltersPanel />` por:

```tsx
<FiltersPanel filtros={filtros} items={actividades} persistKey="stratix-filtros" />
```

`persistKey` se mantiene en `"stratix-filtros"` y **no** se renombra: es la clave con la que cada
persona tiene guardado si dejó el panel abierto o recogido, y cambiarla se lo reabre a todos.

Las dos `toggle('periodo')` / `toggle('empresa')` del mismo archivo pasan a `filtros.setValor` y
`filtros.valores`.

- [ ] **Step 5: Borrar el panel viejo de Stratix**

```bash
git rm -r src/features/tasks/components/overview/StratixFiltersPanel/
```

- [ ] **Step 6: Lo mismo en Research**

En `src/features/research/hooks/useResearchData.ts`, los imports de las líneas 9-10 pasan a:

```ts
import { applyFilters } from '@/shared/utils'
import { useFilters } from '@/shared/hooks'
```

(el `type FilterValues` deja de hacer falta acá, y el import de `useUserPreference` por su ruta
—`@/shared/hooks/useUserPreference`— sale: era además una violación de la regla del barrel).

La línea 32 y las líneas 59-61 se reemplazan por:

```ts
  const filtros = useFilters('research', LEAD_FILTERS)
```
```ts
  const filteredLeads = applyFilters(leads, filtros.visibles, filtros.valores)
```

La 67 pasa a:

```ts
  const exceptOwn = (key: string) =>
    applyFilters(leads, filtros.visibles.filter(d => d.key !== key), filtros.valores)
```

Y en el objeto que se devuelve (línea 250), los tres campos sueltos
`filterValues, setFilterValue, clearFilters` se reemplazan por `filtros`.

**Ojo con la clave de localStorage.** La de Research es `'research-lead-filters'`, no
`'research-filters'` (esa es la `persistKey` del Panel, otra cosa). Al pasar a
`useFilters('research', …)` la clave nueva es `filtros:research`, así que **cada persona pierde
los filtros que tenía puestos** y el panel abre limpio. Es aceptable —son valores de una sesión,
no datos— y no se migra: escribir un migrador de localStorage para un valor efímero cuesta más
que el valor. Anotarlo en el aviso del despliegue.

`<FiltersPanel />` se monta en DOS lugares y los dos cambian:

En `src/features/research/components/DashboardTab.tsx`, el import de la línea 10 pasa a
`FiltersPanel` y la línea 36 queda:

```tsx
      <FiltersPanel filtros={filtros} items={leads} persistKey="research-filters" />
```

El `<div style={{ marginBottom: 14 }}>` que lo envolvía **se borra**: es un `style` inline de los
que la regla prohíbe, y `FiltersPanel` ya trae su propio margen inferior.

En `src/features/research/components/leads/LeadsTab.tsx`, el import de la línea 7 y el montaje de
la línea 31, igual. Los dos leen `filtros` y `leads` de `useResearch()`.

```bash
git rm src/features/research/components/FiltersPanel.tsx
```

- [ ] **Step 7: Borrar las claves i18n que quedaron sin uso**

`stratix.filter.clear`, `stratix.filter.activeCount`, `stratix.section.filters`,
`research.filter.clear`, `research.filter.activeCount` y `research.section.filters` los reemplazan
las `common.filter.*`. Verificar que ninguna quedó referenciada antes de borrarlas de los dos
locales:

```bash
grep -rn "stratix.filter.clear\|stratix.filter.activeCount\|stratix.section.filters\|research.filter.clear\|research.filter.activeCount\|research.section.filters" src/
```

Esperado: sólo los dos `.json`. Las `stratix.filter.all*` (los rótulos de cada def) **se quedan**.

- [ ] **Step 8: Verificar tipos y suite**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Esperado: PASS, 531 tests o más.

- [ ] **Step 9: Verificar en el navegador**

Con `pnpm dev`, en `/tasks` → Dashboard:

1. La barra se ve como siempre, y al final tiene un **«+ Filtro»**. Abrirlo: seis checkboxes, todos marcados.
2. Elegir una marca (por ejemplo EMC): el tablero baja de 267 tareas a las de esa marca, y el chip de la cabecera dice 1 activo.
3. **Sin quitar la marca, esconder ese filtro** desde «+ Filtro»: el desplegable desaparece **y el tablero vuelve a 267**. Un filtro escondido no filtra. Si las tareas siguen filtradas, el consumidor está pasando `filtros.defs` en vez de `filtros.visibles` a `applyFilters` — que es el bug invisible que este paso existe para atrapar.
4. **Recargar:** sigue escondido y sigue sin filtrar.
5. Volver a mostrarlo desde «+ Filtro»: reaparece **con EMC puesto** y el tablero vuelve a filtrar. Esconder es reversible y no borra el valor.
6. Poner dos filtros, abrir «Guardar vista», escribir `Mi trimestre` y guardar. El desplegable de vistas ahora la ofrece.
7. Limpiar los filtros, elegir `Mi trimestre` del desplegable: vuelven los dos valores **y** los filtros escondidos que tenía guardados.
8. **Recargar la página con `Mi trimestre` elegida:** el desplegable sigue diciendo `Mi trimestre`, no «Sin vista». Si vuelve a «Sin vista», `vistaId` no está viajando en el estado persistido.
9. Con `Mi trimestre` puesta, cambiar un filtro: aparece **«• modificada»** y un botón **«Actualizar»**. Tocar «Actualizar»: la marca desaparece. Recargar: sigue sin marca, y los valores son los nuevos.
10. Volver a cambiar un filtro y después **volver a elegir `Mi trimestre`** del desplegable: los valores vuelven a los guardados y la marca desaparece sin haber tocado «Actualizar».
11. Con `Mi trimestre` elegida, tocar «Abrir con esta». **Cerrar sesión, volver a entrar:** el tablero abre con esa vista puesta y la vista aparece con un ★.
12. Guardar una segunda vista y marcarla como la de apertura: la ★ se mueve. Ese es el índice único parcial funcionando — si diera error de duplicado, las dos sentencias de `marcarPorDefecto` están en el orden equivocado.
13. Borrar la vista que estaba elegida: desaparece del desplegable, que vuelve a «Sin vista» **sin quedar en blanco**. Los filtros que había en pantalla se quedan puestos — borrar la vista no es limpiar la pantalla.
14. **Con otro usuario:** su desplegable de vistas está vacío. Si ve las de Wagner, la policy no está cortando por `usuario_id`.
15. Repetir 1, 3, 6, 7 y 9 en `/research`.

- [ ] **Step 10: Gate y commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido && pnpm build:check
```

```bash
git add src/shared/components/filters/FiltersPanel/ src/features/tasks/ src/features/research/ src/shared/i18n/locales/
git commit -m "feat(filtros): un solo panel de filtros para todo el proyecto

Los dos paneles duplicados —Stratix y Research, con el mismo Panel, el mismo chip
y la misma llamada a FilterBar— se borran por uno compartido, que ahora además
trae las vistas guardadas y el menú de qué filtros ver.

El estado sigue viviendo en el hook de cada módulo y no en el panel: el tablero
de /tasks lee el conjunto filtrado para sus KPIs, así que no puede estar encerrado
en un componente de presentación.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

---

# Fase 4 — el vocabulario de controles

Sale del análisis de aplicabilidad del 04/09 y **no bloquea nada de las fases 1-3**: son las tres
piezas que faltan para que el motor entre en los seis módulos restantes. Se puede desplegar la
tanda anterior sin esto.

El hallazgo que la ordena: **hay seis componentes que se llaman `Chip` y son dos cosas distintas.**
`RoleChip`, `DepartmentChip` y `DateFilterChip` son filtros —un botón que representa un valor de
una columna—; `BrandChip`, `DroppedHeaderChip` y `CountryChip` son etiquetas que se leen y no se
eligen. Que se vean iguales es un defecto: la app le dice «esto es clickeable» a algo que no lo es.

### Task 8: `kind: 'chips'` — un chip de filtro es un `<select>` con otra piel

Los tres chips de filtro contestan la misma pregunta que `SelectFilter` («¿qué valor de esta
columna?») y admiten la misma respuesta (una sola). Lo único distinto es la forma de dibujarla:
chips cuando las opciones son pocas y vale verlas todas, `<select>` cuando son muchas. Eso ya es
un campo del motor —`FilterDef.kind`— al que le falta un valor.

**Files:**
- Modify: `src/shared/utils/filters/defs/index.ts` y su test
- Create: `src/shared/components/filters/ChipFilter/index.tsx` + `index.module.css`
- Modify: `src/shared/components/filters/FilterBar/index.tsx`
- Delete: `src/features/admin/components/RoleChip.tsx`, `src/features/medical/components/DateFilterChip.tsx`, `src/features/directorio/components/DepartmentChip/`

**Interfaces:**
- Consumes: `FilterDef<T>`, `distinctValues`.
- Produces: `kind: 'chips'` en `FilterDef`, `conteoPorOpcion`, y el componente `ChipFilter`.

- [ ] **Step 1: El test que falla**

`DepartmentChip` muestra cuántos miembros tiene cada departamento. Esa cuenta es generalizable y
es lo único de esta tarea que es lógica. Al final de `src/shared/utils/filters/defs/index.test.ts`:

```ts
describe('conteoPorOpcion', () => {
  const filas = [{ area: 'mkt' }, { area: 'med' }, { area: 'mkt' }]
  const def: FilterDef<{ area: string }> = {
    key: 'area', labelKey: 'x', kind: 'chips',
    options: items => distinctValues(items, r => r.area),
    match: (r, v) => r.area === v,
  }

  it('cuenta cuántos items caen en cada opción', () => {
    expect(conteoPorOpcion(filas, def)).toEqual({ mkt: 2, med: 1 })
  })

  // Una opción del dominio que hoy no tiene filas se muestra en cero, no se esconde: el chip
  // sirve para preguntar «¿no hay ninguna de Medical?» y una opción que desaparece no deja.
  it('una opción sin items cuenta cero, no desaparece', () => {
    const conDominio = { ...def, options: () => ['mkt', 'med', 'ops'] }
    expect(conteoPorOpcion(filas, conDominio)).toEqual({ mkt: 2, med: 1, ops: 0 })
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
pnpm test src/shared/utils/filters/
```

Esperado: FAIL — `conteoPorOpcion is not a function`.

- [ ] **Step 3: El kind y la cuenta**

En `src/shared/utils/filters/defs/index.ts`, ampliar el campo que ya existe:

```ts
  kind?: 'select' | 'text' | 'date' | 'chips' // control a renderizar; default 'select'
```

y al final del archivo:

```ts
// Cuántos items caen en cada opción de un def. Es lo que le da al chip su número, y sale del
// motor y no del módulo: `DepartmentChip` lo calculaba contra `DIRECTORIO_DATA` importado a mano,
// que ata un componente de UI a un dataset concreto.
export function conteoPorOpcion<T>(items: T[], def: FilterDef<T>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const o of def.options?.(items) ?? []) out[o] = items.filter(i => def.match(i, o)).length
  return out
}
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
pnpm test src/shared/utils/filters/
```

- [ ] **Step 5: El componente**

`src/shared/components/filters/ChipFilter/index.tsx`:

```tsx
'use client'
import type { FilterDef } from '@/shared/utils'
import { conteoPorOpcion } from '@/shared/utils'
import s from './index.module.css'

// Una fila de chips para un filtro de selección única. Reemplaza a `RoleChip`, `DateFilterChip` y
// `DepartmentChip`, que eran el mismo botón con tres radios y tres opacidades de acento distintas.
//
// El chip vacío («Todos») va primero y su valor es la cadena vacía: es el mismo «sin filtro» que
// el placeholder de un `<select>`, así que el motor no distingue entre las dos formas.
export default function ChipFilter<T>({ def, items, value, onChange, label, labelTodos, conCuenta = false }: {
  def: FilterDef<T>
  items: T[]
  value: string
  onChange: (value: string) => void
  label: (value: string) => string
  labelTodos: string
  conCuenta?: boolean
}) {
  const cuentas = conCuenta ? conteoPorOpcion(items, def) : null
  const opciones = def.options?.(items) ?? []
  const chip = (v: string, texto: string, n: number | null) => (
    <button key={v || '__todos'} type="button" onClick={() => onChange(v)}
      className={value === v ? `${s.chip} ${s.activo}` : s.chip}>
      {texto}{n !== null && <span className={s.cuenta}>{n}</span>}
    </button>
  )
  return (
    <div className={s.fila}>
      {/* El de «Todos» no lleva cuenta: contaría el total, que ya está en el título. */}
      {chip('', labelTodos, null)}
      {opciones.map(o => chip(o, label(o), cuentas ? cuentas[o] ?? 0 : null))}
    </div>
  )
}
```

`src/shared/components/filters/ChipFilter/index.module.css`:

```css
.fila {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  align-items: center;
}

/* Un solo radio y una sola opacidad de acento para los tres casos que había: RoleChip usaba
   20px y 26% de acento, DateFilterChip 8px y 18%, DepartmentChip su propio módulo. */
.chip {
  padding: 0.375rem 0.75rem;
  border-radius: 1.25rem;
  border: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-t2);
  font-size: 0.6875rem;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

/* El filtro activo se marca con el acento y NO con el rojo: ese color queda reservado para lo
   destructivo y los errores. */
.activo {
  border-color: var(--c-accent);
  background: color-mix(in srgb, var(--c-accent) 15%, transparent);
  color: var(--c-accent);
}

.cuenta {
  margin-left: 0.375rem;
  font-family: 'DM Mono', monospace;
  opacity: 0.7;
}
```

- [ ] **Step 6: `FilterBar` ramifica sobre el kind nuevo**

En `src/shared/components/filters/FilterBar/index.tsx`, antes de la rama de `'select'`:

```tsx
      {defs.map(d => d.kind === 'chips' ? (
        <ChipFilter key={d.key} def={d} items={items} value={values[d.key] ?? ''}
          onChange={v => onChange(d.key, v)} label={v => d.optionLabel?.(v) ?? v}
          labelTodos={labelFor(d)} conCuenta={d.conCuenta} />
      ) : d.kind && d.kind !== 'select' ? (
```

y agregar `conCuenta?: boolean` a `FilterDef`, con su comentario: es una decisión del def —el
número sirve en Directorio y estorba en un filtro de fechas— y no del componente.

- [ ] **Step 7: Borrar los tres chips y cablear sus módulos**

Admin, Medical y Directorio pasan a declarar su filtro como un def con `kind: 'chips'` y a montar
`FilterBar`. Es la adopción del motor en tres módulos, y va con la verificación de que cada uno
sigue filtrando igual que antes: mismo conteo de filas para el mismo valor elegido.

```bash
git rm src/features/admin/components/RoleChip.tsx src/features/medical/components/DateFilterChip.tsx
git rm -r src/features/directorio/components/DepartmentChip/
```

- [ ] **Step 8: Gate y commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido && pnpm build:check
```

```bash
git add src/shared/utils/filters/ src/shared/components/ui/ src/features/admin/ src/features/medical/ src/features/directorio/
git commit -m "feat(filtros): kind 'chips' — un chip de filtro es un select con otra piel

Tres componentes con el mismo botón y tres radios distintos se vuelven uno, y de
paso Admin, Medical y Directorio adoptan el motor sin perder su look. La cuenta
por opción sale del motor: DepartmentChip la calculaba importando DIRECTORIO_DATA,
que ata un componente de UI a un dataset concreto.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

### Task 9: `Tag` — lo que se lee deja de parecerse a lo que se elige

`BrandChip`, `DroppedHeaderChip` y `CountryChip` no son filtros: son etiquetas. Comparten forma
con los chips que sí se eligen, así que la app promete interacción donde no la hay.

**Files:**
- Create: `src/shared/components/ui/Tag/index.tsx` + `index.module.css`
- Modify: los tres consumidores
- Delete: `src/shared/components/ui/BrandChip/`, `src/shared/import/DroppedHeaderChip/`, `src/features/research/components/CountryChip.tsx`

- [ ] **Step 1: El componente**

`Tag` recibe `texto`, `color?` y `cuenta?`. Sin `cursor: pointer`, sin borde de foco y **sin el
borde de acento del estado activo**, que es lo que hoy los hace parecer clickeables. `BrandChip`
pasa su color de marca por el prop; los otros dos usan el neutro.

- [ ] **Step 2: Reemplazar en los tres consumidores y borrar los viejos**

`CountryChip` está comentado desde la reunión del 2026-07-20 (ver `DashboardTab.tsx:8`): se migra
igual y se deja comentado, no se descomenta. Restaurarlo es una decisión de dirección, no de
refactor.

- [ ] **Step 3: Gate y commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido
```

```bash
git add src/shared/components/ui/Tag/ src/shared/components/shell/ src/shared/import/ src/features/research/
git commit -m "refactor(ui): Tag para lo que se lee, ChipFilter para lo que se elige

Seis componentes se llamaban Chip y eran dos cosas: tres se eligen y tres se leen.
Que se vieran iguales le prometía interacción al usuario donde no la hay.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

### Task 10: ✅ HECHA (701cb33) — `ListToolbar` sin estilos por props

Es la tarea 1 otra vez, sobre el otro encabezado. `ListToolbar` recibe `inputStyle` desde
`useApp()` y dibuja con `style` inline; es el encabezado de Admin, Directorio y los catálogos de
organización, así que **es el bloqueante de los cuatro módulos administrativos**, igual que los
tres props de estilo lo eran de los dos tableros.

**Files:**
- Create: `src/shared/components/ui/ListToolbar/index.module.css`
- Modify: `src/shared/components/ui/ListToolbar/index.tsx` y sus consumidores

- [ ] **Step 1: El CSS module**

El `<input>` de búsqueda usa las mismas variables que `.control` de `FilterBar` —es el mismo
control— más su ancho fijo de `13.75rem` (los 220px de hoy). La fila reproduce el `gap: 1rem` y el
`margin-bottom: 0.875rem` actuales.

- [ ] **Step 2: Sacar el prop y `useApp()`**

`inputStyle` sale de la firma y con él el `useApp()`, que en este componente sólo estaba para eso.

- [ ] **Step 3: Verificar**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido
```

El typecheck es la prueba: falla si algún consumidor sigue pasando el prop. Y en el navegador, el
buscador de `/admin`, `/directorio` y los catálogos tiene que verse idéntico.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/ui/ListToolbar/ src/features/admin/ src/features/directorio/
git commit -m "refactor(ui): ListToolbar deja de recibir su look por props

Misma deuda que la tarea 1 le sacó a FilterBar, sobre el otro encabezado: era el
bloqueante de los cuatro módulos administrativos.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

### Task 11: Las importaciones que este plan dejó a la vista

La regla de persistencia obligó a mirar los diez lugares que llaman a `useUserPreference`, y ahí
apareció otra cosa: **entran por la ruta del módulo y no por el barrel**
(`@/shared/hooks/useUserPreference` en vez de `@/shared/hooks`), que es una regla del repo que ya
existe. Va acá y no en su propio PR porque son los mismos archivos que las tareas anteriores
tocan, y porque migrar por contacto reparte el costo entre quien ya tiene el archivo abierto.

**Alcance: los diez de `useUserPreference`, no los 81 del repo.** Medido el 04/09/2026, 81
archivos entran por ruta a algún directorio de `src/shared/`. Arreglarlos todos es una tanda
aparte y no la disfraza este plan.

**Files:**
- Modify: `src/features/cobranzas/hooks/useCobranzasData.ts`
- Modify: `src/features/research/hooks/useResearchData.ts`
- Modify: `src/shared/components/dashboard/Panel/index.tsx`
- Modify: `src/shared/components/dashboard/StatCard/index.tsx`
- Modify: `src/shared/components/access/ModuleGate/index.tsx`
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: Cambiar la ruta por el barrel**

En los seis, la línea

```ts
import { useUserPreference } from '@/shared/hooks/useUserPreference'
```

pasa a

```ts
import { useUserPreference } from '@/shared/hooks'
```

Si el archivo ya importaba algo más de `@/shared/hooks` (por ejemplo `oneOf`), las dos líneas se
funden en una.

**La excepción son los archivos de adentro de `src/shared/hooks/`**, que tienen que seguir
entrando por `../useUserPreference`: pasar por el barrel desde ahí cierra un ciclo. Es lo mismo que
documenta el encabezado de `src/shared/utils/index.ts`.

- [ ] **Step 2: Los cuatro que NO entran acá, y por qué**

`AdminModule.tsx`, `MedicalModule.tsx`, `AccountingModule.tsx` y `ResearchModule.tsx` tienen la
misma importación mal, pero **son componentes sueltos**: cualquier edición sobre ellos la frena la
regla «el que toca un archivo lo deja en la convención vigente», que exige moverlos a carpeta
primero. Cambiar un import costaría cuatro migraciones de componente con sus importadores.

No entran en esta tarea. Van cuando alguien abra esos archivos por trabajo real — que es
exactamente lo que la regla de contacto promete — o en una tarea propia que se llame lo que es:
mover cuatro componentes a carpeta.

- [ ] **Step 3: Verificar que no quedó ninguno de los seis**

```bash
grep -rn "@/shared/hooks/useUserPreference" src/ | grep -v "src/shared/hooks/"
```

Esperado: sólo los cuatro del paso 2.

- [ ] **Step 4: Gate y commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido
```

```bash
git add src/features/cobranzas/ src/features/research/ src/shared/components/ "src/app/(app)/page.tsx"
git commit -m "refactor(imports): useUserPreference entra por el barrel de hooks

Seis de los diez. Los otros cuatro son componentes sueltos y tocarlos exige
moverlos a carpeta primero: eso es una migración, no un cambio de import, y va
con su nombre propio.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AQXcHNJBHYAprdaMdEQUrW"
```

---

## Despliegue a producción

La migración de `vistas_filtro` va con el procedimiento que exige el centinela, en este orden y sin saltear ninguno:

- [ ] **Backup primero.** El dump de prod antes de tocar nada. Son DOS piezas si hay policies en juego: `pnpm supabase db dump --linked --data-only` **no** cubre esquema.
- [ ] **Precheck.** El ensayo de la migración contra los datos de producción cargados en el Postgres local. La migración es puramente aditiva —una tabla nueva que no referencia nadie— así que el riesgo es bajo; se ensaya igual porque no hay proyecto dev y una migración va de local directo a prod.
- [ ] **`pnpm supabase link --project-ref ruedelunbtaomhrzgelc && pnpm supabase db push`.**
- [ ] **Verificación con `SELECT`**, que Wagner corre con `!`:

```sql
select relname, relrowsecurity from pg_class where relname = 'vistas_filtro';
select policyname, cmd from pg_policies where tablename = 'vistas_filtro';
select indexname from pg_indexes where tablename = 'vistas_filtro';
```

Esperado: `relrowsecurity = t`, una policy `vistas_filtro_propias` para `ALL`, y cuatro índices.

- [ ] **El orden importa: la migración va ANTES del merge.** La tabla nueva es inerte para el código que corre hoy; el código nuevo, en cambio, no sobrevive a la base vieja — `useVistas` haría un `list` contra una tabla que no existe y el panel de filtros quedaría vacío en las dos rutas.
- [ ] **Avisar del cambio.** Dos cosas, y la segunda es la que va a generar preguntas:
  1. La barra de filtros gana dos controles nuevos en `/tasks` y `/research` — el selector de vistas y el «+ Filtro».
  2. **Los filtros que cada quien tenía puestos se pierden una vez.** La clave de localStorage cambia (`stratix-act-filters` → `filtros:tasks`, `research-lead-filters` → `filtros:research`), así que las dos pantallas abren limpias la primera vez después del despliegue. No se migra a propósito: son valores de una sesión, no datos, y un migrador de localStorage para un valor efímero cuesta más que el valor. Lo que **no** se pierde son las vistas guardadas — todavía no hay ninguna.

---

## Lo que este plan NO hace

Sale del spec y se anota acá para que no se cuele por contacto:

- **Operadores por columna** (*contiene / antes de / está vacío*). Exige matar `FilterDef.match` y reescribir los ~15 defs que ya existen. No se paga mientras «poder filtrar» alcance.
- **Grupos AND/OR anidados.**
- **Agrupar.** Es otro eje: cambia cómo se dibuja la tabla, no qué filas entran.
- **Adoptar el motor en Cobranzas, Reuniones y Accounting.** (Admin, Medical y Directorio entran con la tarea 8.) Es un `FilterDef[]` por tabla y un PR chico por módulo. Este plan lo desbloquea pero no lo ejecuta: son subsistemas independientes, y cada uno produce software funcionando por su cuenta. La aplicabilidad módulo por módulo está medida en la sección «Aplicabilidad» del spec, con dos cosas que hay que resolver **antes** de esa tanda y no durante:
  1. **Cobranzas comparte UN estado de filtros entre tres tablas** (Ventas, Cuentas, Depósitos, cada una con un subconjunto de las seis claves) y eso es deliberado. `useFilters` asume un ámbito por tabla; hace falta que una pestaña pueda declarar con qué subconjunto de defs filtra, o el contador de activos y el «+ Filtro» mienten en las tres.
  2. **`ListToolbar` recibe `inputStyle` por props y dibuja con `style` inline** — la misma deuda que la tarea 1 le saca a `FilterBar`. Es el encabezado de Admin, Directorio y los catálogos, así que es el bloqueante de los cuatro módulos administrativos.
- **Encender las vistas guardadas en Directorio y Accounting.** Leen datos hardcodeados (`DIRECTORIO_DATA`, `accounting/data.ts`): el motor y la barra les sirven, las vistas no resuelven nada hasta que esos módulos tengan datos de la base.
- **Compartir una vista con el equipo.** Una columna `compartida boolean` y un `OR` en la policy, los dos aditivos. Se agrega el día que alguien lo pida.
- **Un registro de columnas por tabla** —lo que haría que filtro, orden, encabezados, export CSV y ficha salgan de una sola descripción. Es el techo siguiente y el que de verdad vale, pero no se escribe bien sin haber adoptado el motor en dos o tres módulos primero.
- **Que el usuario elija la forma de cada filtro** (chips o desplegable). Lo decide el `kind` del def. Fuera de alcance: cuando entre, entra completo. Ver el spec.
- **Estrenar `@testing-library` y un entorno DOM en Vitest.** El repo no los tiene y esta tanda no es la excusa para agregarlos: la lógica pura lleva test, la pantalla se verifica en la pantalla.
- **Renombrar `persistKey`.** `"stratix-filtros"` y `"research-filters"` se quedan como están aunque el módulo ya no se llame Stratix: es la clave con la que cada persona tiene guardado si dejó el panel abierto, y cambiarla se lo reabre a todos.

# `actividades.fecha_inicio` — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar `actividades.mes` (text, `'Agosto'`, sin año) por `actividades.fecha_inicio` (date), y borrar las tres columnas que sólo pueden desincronizarse: `trimestre`, `semana` y `sheet_row`.

**Architecture:** Dos fases. La fase 1 **agrega** `fecha_inicio`, backfilea las 329 filas y hace que el código escriba las dos columnas pero lea sólo `fecha_inicio`; `mes` queda como testigo para verificar el backfill en producción con un `SELECT`. La fase 2 dropea las cuatro columnas viejas. La derivación del mes, el trimestre y la etiqueta del período viven en un módulo puro nuevo (`utils/periodo`) con tests.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Supabase CLI (migraciones SQL) · Vitest · `Intl.DateTimeFormat` para el formateo por idioma.

**Spec:** `docs/superpowers/specs/2026-08-31-fecha-inicio-design.md`

## Global Constraints

Reglas del centinela que aplican a cada tarea (`~/.local/share/centinela/reglas`):

- **Un archivo se lee de una sentada: 50 líneas, y 150 es el techo.** Si una edición pasa el techo, el archivo se parte — no se agrega una marca de exención sin aprobación de Wagner.
- **Lo que cuenta plata, horas o tareas lleva test.** `report-filter.ts` y `utils/periodo` son ese camino: ninguna de las dos se toca sin test primero.
- **Las fechas del calendario se calculan en hora local.** Nada de `toISOString()`: se usa `localDate`/`localMonth` de `@/shared/utils/dates`. Los tests corren con `TZ=America/Guayaquil` (ya está en `pnpm test`).
- **i18n: integrar, no ignorar.** Todo texto nuevo visible sale de `t()` con su clave en `es.json` **y** `en.json`. Nada de `i18n-ignore`.
- **Los valores de dominio salen de constantes**, y el valor canónico no es la etiqueta.
- **Nada de `../../`:** fuera del vecindario se importa con `@/`.
- **El atributo `style` está prohibido** (excepto `report-html`, que es una plantilla para otra ventana y ya tiene su exención).
- **Las medidas van en `rem`, no en píxeles.**
- **No commitear sin que Wagner apruebe** (`rules/proceso.md`). Los pasos de commit preparan el commit; la aprobación es de él.
- **`supabase db reset` está PROHIBIDO en este repo.** Se usa `pnpm supabase migration up`.

Valores exactos que se repiten en varias tareas:

- Columna nueva: `fecha_inicio date NOT NULL DEFAULT CURRENT_DATE`
- Clave de agrupación en TypeScript: `'YYYY-MM'` (lo que guardan el filtro y `ReporteCriterios`)
- Backfill del histórico: **día 1** del mes que declaraba `mes`
- Año de relleno cuando no hay ninguna fecha: **2026**

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| **Crear** `src/features/stratix-mkt/utils/periodo/index.ts` | Módulo puro: derivar mes, trimestre y etiqueta desde una fecha. Único lugar con esa aritmética |
| **Crear** `src/features/stratix-mkt/utils/periodo/index.test.ts` | Sus tests |
| **Crear** `supabase/migrations/<ts>_actividades_fecha_inicio.sql` | Fase 1: typos de año, columna, backfill, guard |
| **Crear** `supabase/migrations/<ts>_actividades_drop_derivadas.sql` | Fase 2: el drop |
| **Modificar** `src/shared/context/loadAppData.ts` | El tipo `Actividad` |
| **Modificar** `src/features/stratix-mkt/types.ts` | `NuevaActForm`, `ReporteCriterios` |
| **Modificar** `src/features/stratix-mkt/report-filter.ts` | El filtro del reporte de pago |
| **Modificar** `src/features/stratix-mkt/utils/act-filters/index.ts` | Filtros de trimestre y período |
| **Modificar** `src/features/stratix-mkt/utils/act-detail-fields/grupos/periodo.ts` | Tres campos de la ficha pasan a dos |
| **Modificar** `src/features/stratix-mkt/utils/act-form.ts` | Mapeo actividad → formulario |
| **Modificar** `src/features/stratix-mkt/utils/report-html/index.ts` | La hoja imprimible |
| **Modificar** `src/features/stratix-mkt/hooks/{useReporte,useKanban,useTablero,useActividadForm}/index.ts` | Criterios, agrupaciones y payload |
| **Modificar** `src/features/stratix-mkt/components/…` | `ActivityNumeros`, `ReporteTab`, `KanbanTab`, `KanbanTaskCard`, `TaskTableRow`, `OverviewTab` |
| **Modificar** `src/shared/i18n/locales/{es,en}.json` | Clave `stratix.detail.start` |

---

## Fase 1 — la columna nueva, sin borrar nada

### Task 1: El módulo `utils/periodo`

Cuatro funciones puras, sin React y sin Supabase, con sus tests. Es la base de todo lo demás y nada más lo consume todavía.

**Files:**
- Create: `src/features/stratix-mkt/utils/periodo/index.ts`
- Test: `src/features/stratix-mkt/utils/periodo/index.test.ts`

**Interfaces:**
- Consumes: nada del repo — es autocontenido
- Produces:
  - `claveMes(fecha: string | null | undefined): string` → `'2026-08'` (`''` si no hay dato)
  - `trimestreDe(fecha: string | null | undefined): string` → `'Q3'` (`''` si no hay dato)
  - `periodoLargo(fecha: string | null | undefined, intlLocale: string, mes?: 'long' | 'short'): string` → `'agosto 2026'` / `'August 2026'`
  - `periodosDisponibles(fechas: (string | null | undefined)[]): string[]` → `['2026-01', …, '2026-12']`

No hay función para "la fecha de inicio de una tarea nueva": la pone el `DEFAULT CURRENT_DATE` de la base, y en el formulario el fallback es `localDate()` de `@/shared/utils/dates`, que ya existe.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/stratix-mkt/utils/periodo/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { claveMes, trimestreDe, periodoLargo, periodosDisponibles } from './index'

describe('claveMes', () => {
  it('recorta el día', () => {
    expect(claveMes('2026-08-17')).toBe('2026-08')
  })
  it('sin dato devuelve vacío, no revienta', () => {
    expect(claveMes(null)).toBe('')
    expect(claveMes(undefined)).toBe('')
  })
})

describe('trimestreDe', () => {
  it('mapea los cuatro trimestres', () => {
    expect(trimestreDe('2026-02-14')).toBe('Q1')
    expect(trimestreDe('2026-04-01')).toBe('Q2')
    expect(trimestreDe('2026-09-30')).toBe('Q3')
    expect(trimestreDe('2026-12-25')).toBe('Q4')
  })
  it('marzo es Q1 — el caso que la columna guardaba mal en 45 filas de producción', () => {
    expect(trimestreDe('2026-03-17')).toBe('Q1')
  })
  it('sin dato devuelve vacío', () => {
    expect(trimestreDe(null)).toBe('')
    expect(trimestreDe('basura')).toBe('')
  })
})

describe('periodoLargo', () => {
  it('nombra el mes en el idioma de quien mira', () => {
    expect(periodoLargo('2026-08-17', 'es-EC')).toMatch(/agosto.*2026/i)
    expect(periodoLargo('2026-08-17', 'en-US')).toMatch(/August.*2026/i)
  })
  it('en corto, para la tarjeta del Kanban', () => {
    expect(periodoLargo('2026-08-17', 'en-US', 'short')).toMatch(/Aug.*2026/i)
  })
  it('no cae en la trampa de UTC: parte el string, no construye un Date del ISO', () => {
    // `new Date('2026-01-01')` es UTC y en UTC-5 se imprime 31/12/2025. El período es enero.
    expect(periodoLargo('2026-01-01', 'en-US')).toMatch(/January.*2026/i)
  })
  it('sin dato devuelve el guion, no "Invalid Date"', () => {
    expect(periodoLargo(null, 'es-EC')).toBe('—')
    expect(periodoLargo('', 'es-EC')).toBe('—')
  })
})

describe('periodosDisponibles', () => {
  it('los 12 meses de cada año presente, ordenados', () => {
    const r = periodosDisponibles(['2026-03-17', '2026-08-02'])
    expect(r).toHaveLength(12)
    expect(r[0]).toBe('2026-01')
    expect(r[11]).toBe('2026-12')
  })
  it('dos años son 24 opciones, sin repetir', () => {
    expect(periodosDisponibles(['2026-03-17', '2027-01-09'])).toHaveLength(24)
  })
  it('sin datos ofrece el año corriente, no una lista vacía', () => {
    const r = periodosDisponibles([])
    expect(r).toHaveLength(12)
    expect(r[0].slice(0, 4)).toBe(String(new Date().getFullYear()))
  })
})
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `pnpm test src/features/stratix-mkt/utils/periodo`
Expected: FAIL — `Failed to resolve import "./index"`

- [ ] **Step 3: Escribir el módulo**

Crear `src/features/stratix-mkt/utils/periodo/index.ts`:

```ts
// A qué mes se imputa una actividad en el reporte de pago. Todo sale de `fecha_inicio`.
//
// Antes era la columna `mes`, un texto: 'Agosto', el mes SIN el año. El reporte filtraba con
// `mes === 'Agosto'` y por lo tanto sumaba ese mes de todos los años; en enero de 2027 el reporte
// de Enero habría incluido enero de 2026 y se habría leído como que la persona trabajó el doble.
// Sale impreso en un pago (ver el diseño del 31/08).
//
// `trimestre` también era una columna, y una columna derivada sólo puede desincronizarse: 45 de
// las 329 filas de producción tenían marzo marcado Q2. Acá se calcula.

// La clave de agrupación, 'YYYY-MM'. Es lo que compara el reporte y lo que guarda el filtro: el
// día no aporta al período y tenerlo obligaría a normalizarlo en cada comparación.
export const claveMes = (fecha: string | null | undefined): string => (fecha ?? '').slice(0, 7)

// Q1..Q4 del mes de la fecha.
export function trimestreDe(fecha: string | null | undefined): string {
  const mes = Number(claveMes(fecha).slice(5, 7))
  return mes >= 1 && mes <= 12 ? `Q${Math.floor((mes - 1) / 3) + 1}` : ''
}

// "agosto 2026" / "August 2026". Antes `{a.mes}` imprimía 'Agosto' aunque la app estuviera en
// inglés. `intlLocale` entra por parámetro por lo mismo que en `fechaCorta`: este módulo no sabe
// de idiomas — sale de `useT().intlLocale`.
//
// Parte el string a mano en vez de `new Date(fecha)`: el constructor interpreta 'YYYY-MM-DD' como
// UTC, así que en UTC-5 un 1 de enero se imprime como diciembre del año anterior.
export function periodoLargo(
  fecha: string | null | undefined,
  intlLocale: string,
  mes: 'long' | 'short' = 'long',
): string {
  const [anio, num] = claveMes(fecha).split('-').map(Number)
  if (!anio || !num || num < 1 || num > 12) return '—'
  return new Date(anio, num - 1, 1).toLocaleDateString(intlLocale, { month: mes, year: 'numeric' })
}

// Lo que ofrecen los desplegables de período: los 12 meses de cada año presente en los datos.
// Los 12 y no los que tienen tareas, por lo mismo de siempre — el tablero se usa para ver que un
// mes está VACÍO, y una opción que desaparece cuando no hay tareas no permite preguntarlo.
export function periodosDisponibles(fechas: (string | null | undefined)[]): string[] {
  const anios = new Set(fechas.map(f => claveMes(f).slice(0, 4)).filter(Boolean))
  if (!anios.size) anios.add(String(new Date().getFullYear()))
  return [...anios].sort().flatMap(a =>
    Array.from({ length: 12 }, (_, i) => `${a}-${String(i + 1).padStart(2, '0')}`))
}
```

- [ ] **Step 4: Correr los tests y verlos pasar**

Run: `pnpm test src/features/stratix-mkt/utils/periodo`
Expected: PASS — 12 tests

- [ ] **Step 5: Preparar el commit**

```bash
git add src/features/stratix-mkt/utils/periodo/
git commit -m "feat(stratix): modulo periodo — derivar mes y trimestre de una fecha"
```

---

### Task 2: La migración de la fase 1

Agrega `fecha_inicio`, corrige los 12 años tipeados mal, backfilea las 329 filas y **aborta** si el backfill no coincide con `mes`. No borra ninguna columna.

**Files:**
- Create: `supabase/migrations/<timestamp>_actividades_fecha_inicio.sql`

**Interfaces:**
- Produces: la columna `actividades.fecha_inicio date NOT NULL DEFAULT CURRENT_DATE`, que consumen las tareas 3 a 11.

- [ ] **Step 1: Crear el archivo de migración**

```bash
pnpm supabase migration new actividades_fecha_inicio
```

Anotar la ruta que imprime — es la que se edita en el paso siguiente.

- [ ] **Step 2: Escribir la migración**

Contenido completo del archivo creado:

```sql
-- Cuándo empieza el trabajo de una actividad, y con eso a qué mes se imputa en el reporte de pago.
--
-- `mes` era `text` y guardaba 'Agosto' — el mes sin el año. El reporte de pago filtra con
-- `mes = 'Agosto'` y por lo tanto suma ese mes de TODOS los años. Hoy casi no se nota porque hay
-- una sola temporada cargada; en enero de 2027 el reporte de Enero incluiría enero de 2026 y se
-- leería como que la persona trabajó el doble, no como un error. Sale impreso en un pago.
--
-- Esta migración NO BORRA NADA. Agrega `fecha_inicio` y deja `mes`, `trimestre`, `semana` y
-- `sheet_row` donde están, como testigos: el backfill se verifica en producción comparando
-- contra ellas, sobre datos reales. El drop va en una segunda migración, después.
--
-- Diseño: docs/superpowers/specs/2026-08-31-fecha-inicio-design.md

-- 1. Los años tipeados mal.
--
-- Doce filas tienen fechas como '0206-03-23': un 2026 al que se le perdió un dígito al cargarlo
-- desde el Google Sheet. Se corrigen EN las columnas de fecha y no sólo al calcular
-- `fecha_inicio`, porque mientras el typo esté el Gantt dibuja esas barras en el año 206 — es el
-- bug que documenta `updateFecha` en src/shared/data/actividades.ts.
UPDATE public.actividades
   SET fecha_requerida = make_date(2026,
         EXTRACT(MONTH FROM fecha_requerida)::int,
         EXTRACT(DAY   FROM fecha_requerida)::int)
 WHERE fecha_requerida IS NOT NULL
   AND EXTRACT(YEAR FROM fecha_requerida) < 1900;

UPDATE public.actividades
   SET fecha_entrega = make_date(2026,
         EXTRACT(MONTH FROM fecha_entrega)::int,
         EXTRACT(DAY   FROM fecha_entrega)::int)
 WHERE fecha_entrega IS NOT NULL
   AND EXTRACT(YEAR FROM fecha_entrega) < 1900;

-- 2. La columna.
ALTER TABLE public.actividades ADD COLUMN IF NOT EXISTS fecha_inicio date;

COMMENT ON COLUMN public.actividades.fecha_inicio IS
  'Cuándo empieza el trabajo de la tarea. Su MES es el período de imputación del reporte de pago, '
  'y de ahí salen también el trimestre y los filtros. Reemplaza a `mes` (text, sin año). '
  'Las filas migradas del Google Sheet llevan el día 1 como marcador: el Sheet declaraba el mes, '
  'no el día. NO es `created_at`, que sigue siendo la marca de auditoría de cuándo entró la fila.';

-- 3. El backfill. Una sola regla para las 329 filas: el día 1 del mes que declaraba `mes`, con el
--    año sacado de `fecha_requerida`, si no de `fecha_entrega`, y si ninguna sirve, 2026.
--
--    · El MES sale de `mes` y no de otra fecha: es el dato imputado y es autoritativo. Unas 16
--      filas tienen `fecha_requerida` en un mes distinto del que declaraban (una del 27 de febrero
--      imputada a Marzo); usarla las movería de mes de pago y cambiaría cifras ya vistas.
--    · El DÍA es 1 porque el Sheet nunca dijo un día. De acá en adelante la columna guarda el día
--      real: lo pone el DEFAULT.
--    · 2026 no es inventar: es el único año que existe en toda la tabla.
--
--    No se usa `created_at` como fuente: las 251 filas migradas lo tienen en abril de 2026, que es
--    cuándo corrió la migración del Sheet y no cuándo se hizo el trabajo. De ellas, 238 están
--    imputadas a enero, febrero o marzo.
UPDATE public.actividades a
   SET fecha_inicio = make_date(
         CASE
           WHEN EXTRACT(YEAR FROM a.fecha_requerida) >= 1900 THEN EXTRACT(YEAR FROM a.fecha_requerida)::int
           WHEN EXTRACT(YEAR FROM a.fecha_entrega)   >= 1900 THEN EXTRACT(YEAR FROM a.fecha_entrega)::int
           ELSE 2026
         END,
         array_position(
           ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
           a.mes)::int,
         1)
 WHERE a.mes IS NOT NULL;

-- Las que no tienen `mes` (ninguna en producción hoy, pero la columna lo permite) caen al primer
-- día del mes de su created_at: sin `mes` no hay período imputado que respetar.
UPDATE public.actividades
   SET fecha_inicio = date_trunc('month', created_at)::date
 WHERE fecha_inicio IS NULL;

-- 4. El guard. Si el backfill dejó una sola fila con el mes distinto del que declaraba `mes`, la
--    migración aborta y no se aplica nada: es preferible a un período mal imputado que después
--    sale impreso en un pago.
DO $$
DECLARE desviadas int;
BEGIN
  SELECT count(*) INTO desviadas
    FROM public.actividades
   WHERE mes IS NOT NULL
     AND EXTRACT(MONTH FROM fecha_inicio)::int <> array_position(
           ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'], mes)::int;
  IF desviadas > 0 THEN
    RAISE EXCEPTION 'backfill de fecha_inicio: % filas con el mes distinto de `mes`', desviadas;
  END IF;

  SELECT count(*) INTO desviadas FROM public.actividades WHERE fecha_inicio IS NULL;
  IF desviadas > 0 THEN
    RAISE EXCEPTION 'backfill de fecha_inicio: % filas quedaron sin fecha', desviadas;
  END IF;
END $$;

-- 5. Ahora que todas tienen valor, el default y el NOT NULL.
ALTER TABLE public.actividades
  ALTER COLUMN fecha_inicio SET DEFAULT CURRENT_DATE,
  ALTER COLUMN fecha_inicio SET NOT NULL;
```

- [ ] **Step 3: Aplicarla en local**

Run: `pnpm supabase migration up`
Expected: aplica sin error. Si aborta con `backfill de fecha_inicio: N filas…`, **parar**: el backfill no acertó y hay que revisar la regla, no forzar la migración.

- [ ] **Step 4: Verificar el resultado contra los datos**

Run:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
select count(*) total,
       count(fecha_inicio) con_fecha,
       min(fecha_inicio) desde, max(fecha_inicio) hasta,
       count(*) filter (where to_char(fecha_inicio,'YYYY') <> '2026') fuera_de_2026
  from actividades;"
```

Expected: `con_fecha` = `total`, `fuera_de_2026` = 0, y el rango entre `2026-01-01` y `2026-08-01`.

- [ ] **Step 5: Verificar que el trimestre derivado corrige las filas que estaban mal**

Run:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
select trimestre guardado,
       'Q' || ((extract(month from fecha_inicio)::int - 1) / 3 + 1) derivado,
       count(*)
  from actividades
 where trimestre is distinct from 'Q' || ((extract(month from fecha_inicio)::int - 1) / 3 + 1)
 group by 1,2;"
```

Expected: filas con `guardado = Q2` y `derivado = Q1` — son las de marzo que estaban mal. Ese número es el que va a cambiar en el filtro del tablero, y es la corrección, no una regresión.

- [ ] **Step 6: Preparar el commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): actividades.fecha_inicio — el periodo de imputacion con su anio"
```

---

### Task 3: El tipo y el payload

`Actividad` gana `fecha_inicio`; el formulario y los criterios del reporte dejan de hablar de `mes`. El payload de alta/edición escribe **las dos** columnas durante toda la fase 1.

**Files:**
- Modify: `src/shared/context/loadAppData.ts:64-91`
- Modify: `src/features/stratix-mkt/types.ts:28-47`
- Modify: `src/features/stratix-mkt/hooks/useActividadForm/index.ts:2,11,92-105,118`

**Interfaces:**
- Consumes: `claveMes`, `trimestreDe`, `periodoLargo` de `@/features/stratix-mkt/utils/periodo` (Task 1); `localDate` de `@/shared/utils/dates`
- Produces: `Actividad.fecha_inicio?: string`, `NuevaActForm.fecha_inicio: string`, `ReporteCriterios.mes: string` con formato `'YYYY-MM'`

- [ ] **Step 1: Agregar `fecha_inicio` al tipo `Actividad`**

En `src/shared/context/loadAppData.ts`, dentro de `export type Actividad`, reemplazar la línea `mes?: string` por:

```ts
  // Cuándo empieza el trabajo. Su MES es el período de imputación del reporte de pago.
  // `mes`/`trimestre`/`semana` siguen en la tabla durante la fase 1 pero NADIE los lee: son el
  // testigo para verificar el backfill en producción. Se borran en la fase 2.
  fecha_inicio?: string
  mes?: string
```

- [ ] **Step 2: Cambiar `NuevaActForm` y `ReporteCriterios`**

En `src/features/stratix-mkt/types.ts`, en `ReporteCriterios` reemplazar `mes: string` por:

```ts
  // 'YYYY-MM' — la clave de agrupación, no una etiqueta de mes. `claveMes()` la produce.
  mes: string
```

Y en `NuevaActForm` reemplazar `mes: string` por:

```ts
  fecha_inicio: string
```

- [ ] **Step 3: Escribir `fecha_inicio` en el payload**

En `src/features/stratix-mkt/hooks/useActividadForm/index.ts`:

Línea 2, cambiar el import:

```ts
import { useApp } from '@/shared/context/AppContext'
```

Agregar debajo de los imports existentes:

```ts
import { localDate } from '@/shared/utils/dates'
import { claveMes, trimestreDe, periodoLargo } from '@/features/stratix-mkt/utils/periodo'
```

Línea 11, en `emptyNuevaAct`, reemplazar `mes: MESES[new Date().getMonth()],` por:

```ts
  fecha_inicio: localDate(), horas: '', dias_produccion: '',
```

Arriba del archivo, junto a `emptyNuevaAct`, agregar:

```ts
// Los nombres de mes que espera la columna `mes` mientras siga existiendo (tiene un CHECK con
// estos doce valores exactos). Es transitorio: muere con la fase 2.
const MESES_TESTIGO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
```

En el `payload` (líneas 96-97), reemplazar las dos líneas de `mes`/`trimestre` por:

```ts
        fecha_inicio: valores.fecha_inicio,
        // Fase 1: `mes` y `trimestre` se siguen escribiendo para que el testigo no se quede
        // viejo mientras se verifica el backfill en producción. Se borran en la fase 2.
        mes: MESES_TESTIGO[Number(claveMes(valores.fecha_inicio).slice(5, 7)) - 1] ?? null,
        trimestre: trimestreDe(valores.fecha_inicio) || null,
```

En la línea 118 (el mensaje de la notificación), reemplazar `· ${valores.mes}` por
`· ${periodoLargo(valores.fecha_inicio, intlLocale)}`, y sumar `intlLocale` a la desestructuración de `useT()`:

```ts
  const { t, intlLocale } = useT()
```

- [ ] **Step 4: Verificar que compila**

Run: `pnpm typecheck`
Expected: errores SÓLO en los archivos que todavía leen `a.mes` (act-filters, act-form, useReporte, useKanban, useTablero, report-html, grupos/periodo, ActivityNumeros, ReporteTab, KanbanTab, KanbanTaskCard, TaskTableRow). Esa lista es la hoja de ruta de las tareas 4 a 11.

- [ ] **Step 5: Preparar el commit**

```bash
git add src/shared/context/loadAppData.ts src/features/stratix-mkt/types.ts src/features/stratix-mkt/hooks/useActividadForm/index.ts
git commit -m "feat(stratix): el payload de una actividad escribe fecha_inicio"
```

---

### Task 4: El reporte de pago

Es el camino de la plata. Test primero, sin excepción.

**Files:**
- Modify: `src/features/stratix-mkt/report-filter.ts:6-17`
- Test: `src/features/stratix-mkt/report-filter.test.ts`

**Interfaces:**
- Consumes: `claveMes` de `@/features/stratix-mkt/utils/periodo`
- Produces: `esActividadDeMiembro(act, idMiembro, mes?)` donde `mes` es `'YYYY-MM'`; `totalesProduccion` no cambia de firma

- [ ] **Step 1: Reescribir el test para que falle**

En `src/features/stratix-mkt/report-filter.test.ts`, reemplazar el bloque `const acts = {…}` (líneas 4-10) por:

```ts
const acts = {
  suya:      { responsable_id: 'u1', solicitante_id: 'u9', fecha_inicio: '2026-01-15' },
  pedida:    { responsable_id: 'u9', solicitante_id: 'u1', fecha_inicio: '2026-01-15' },
  ajena:     { responsable_id: 'u9', solicitante_id: 'u8', fecha_inicio: '2026-01-15' },
  otroMes:   { responsable_id: 'u1', solicitante_id: null, fecha_inicio: '2026-03-02' },
  sinMes:    { responsable_id: 'u1', solicitante_id: null, fecha_inicio: null },
  // El bug que motivó todo esto: el MISMO mes, un año después.
  otroAnio:  { responsable_id: 'u1', solicitante_id: null, fecha_inicio: '2027-01-15' },
}
```

En los `it` que pasan un mes, reemplazar `'Enero'` por `'2026-01'` y `'Marzo'` por `'2026-03'`. Y agregar este test nuevo al final del `describe('esActividadDeMiembro')`:

```ts
  it('el reporte de un mes NO incluye ese mes de otro año', () => {
    // Éste es el bug: con `mes = 'Enero'` guardado como texto, esta actividad de 2027 entraba
    // en el reporte de enero de 2026 y las horas se pagaban dos veces.
    expect(esActividadDeMiembro(acts.otroAnio, 'u1', '2026-01')).toBe(false)
    expect(esActividadDeMiembro(acts.otroAnio, 'u1', '2027-01')).toBe(true)
  })

  it('el día no importa: el período es el mes', () => {
    expect(esActividadDeMiembro({ responsable_id: 'u1', fecha_inicio: '2026-01-31' }, 'u1', '2026-01')).toBe(true)
  })
```

En `describe('totalesProduccion')`, reemplazar los `mes: 'Enero'` del array `reporte` por `fecha_inicio: '2026-01-15'`, y los `esActividadDeMiembro(a, 'u1', 'Enero')` por `esActividadDeMiembro(a, 'u1', '2026-01')`.

- [ ] **Step 2: Correr los tests y verlos fallar**

Run: `pnpm test src/features/stratix-mkt/report-filter`
Expected: FAIL — el test del año cruzado da `true` donde espera `false`, porque `act.mes` es `undefined` y el filtro no compara nada.

- [ ] **Step 3: Cambiar el filtro**

En `src/features/stratix-mkt/report-filter.ts`, reemplazar las líneas 6-17 por:

```ts
import { claveMes } from '@/features/stratix-mkt/utils/periodo'

export type ActividadRef = {
  responsable_id?: string | null
  solicitante_id?: string | null
  fecha_inicio?: string | null
}

// `mes` es la clave 'YYYY-MM', no la etiqueta. Antes era `act.mes === 'Agosto'` sobre una columna
// de texto sin año, así que el reporte de un mes sumaba ese mes de TODOS los años: en enero de
// 2027 el reporte de Enero habría incluido enero de 2026. El año va en la clave.
export function esActividadDeMiembro(act: ActividadRef, idMiembro: string, mes?: string): boolean {
  if (!idMiembro) return false
  const suya = act.responsable_id === idMiembro || act.solicitante_id === idMiembro
  if (!suya) return false
  return mes ? claveMes(act.fecha_inicio) === mes : true
}
```

El comentario de cabecera del archivo (líneas 1-5) y todo `totalesProduccion` quedan **sin tocar**: la regla "listar sí, sumar no" no cambia.

- [ ] **Step 4: Correr los tests y verlos pasar**

Run: `pnpm test src/features/stratix-mkt/report-filter`
Expected: PASS — 11 tests, incluido el del año cruzado.

- [ ] **Step 5: Preparar el commit**

```bash
git add src/features/stratix-mkt/report-filter.ts src/features/stratix-mkt/report-filter.test.ts
git commit -m "fix(stratix): el reporte de un mes deja de sumar ese mes de otros anios"
```

---

### Task 5: Los filtros del tablero

`trimestreDe` deja de leer una columna y pasa a derivar; el filtro de mes pasa a ser de período con año.

**Files:**
- Modify: `src/features/stratix-mkt/utils/act-filters/index.ts:9,19-36`
- Test: `src/features/stratix-mkt/utils/act-filters/index.test.ts`

**Interfaces:**
- Consumes: `trimestreDe`, `claveMes`, `periodoLargo`, `periodosDisponibles` de `utils/periodo`
- Produces: `actividadFilters({ t, nombrePorId, intlLocale })` — la firma gana `intlLocale`. `trimestreDe` **deja de exportarse desde acá**: quien la necesite la importa de `utils/periodo`.

- [ ] **Step 1: Escribir el test que falla**

Primero, **borrar** de `src/features/stratix-mkt/utils/act-filters/index.test.ts` el bloque
`describe('trimestreDe')` (líneas 19-28) y sacar `trimestreDe` del import de la línea 2: la
función se mudó a `utils/periodo` con otra firma y sus casos ya están cubiertos allá (Task 1).
Ese test es su único consumidor fuera del propio archivo — verificado con
`grep -rn "trimestreDe" src`.

Después, agregar al mismo archivo:

```ts
import { actividadFilters } from './index'

describe('filtro de período', () => {
  const deps = { t: ((k: string) => k) as never, nombrePorId: {}, intlLocale: 'es-EC' }
  const acts = [
    { id: 'a', fecha_inicio: '2026-03-17' },
    { id: 'b', fecha_inicio: '2027-03-02' },
  ]

  it('el trimestre se deriva de la fecha, no de una columna', () => {
    const trimestre = actividadFilters(deps).find(d => d.key === 'trimestre')!
    // Marzo es Q1. La columna `trimestre` decía Q2 en 45 filas de producción.
    expect(trimestre.match(acts[0], 'Q1')).toBe(true)
    expect(trimestre.match(acts[0], 'Q2')).toBe(false)
  })

  it('el mismo mes de dos años son dos opciones distintas', () => {
    const periodo = actividadFilters(deps).find(d => d.key === 'periodo')!
    expect(periodo.match(acts[0], '2026-03')).toBe(true)
    expect(periodo.match(acts[1], '2026-03')).toBe(false)
    expect(periodo.match(acts[1], '2027-03')).toBe(true)
  })

  it('ofrece los 12 meses de cada año presente, aunque no tengan tareas', () => {
    const periodo = actividadFilters(deps).find(d => d.key === 'periodo')!
    expect(periodo.options(acts)).toHaveLength(24)
  })
})
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `pnpm test src/features/stratix-mkt/utils/act-filters`
Expected: FAIL — no existe ningún def con `key === 'periodo'`.

- [ ] **Step 3: Cambiar los filtros**

En `src/features/stratix-mkt/utils/act-filters/index.ts`:

Línea 9, reemplazar el import por:

```ts
import { TRIMESTRES, TRIMESTRE_GENERAL, COLUMNAS_KANBAN, estadoLabel } from '@/shared/constants/domain'
import { trimestreDe, claveMes, periodoLargo, periodosDisponibles } from '@/features/stratix-mkt/utils/periodo'
```

En `type Deps`, agregar:

```ts
  intlLocale: string // BCP-47 de quien mira: el período se nombra en su idioma
```

Borrar la constante `trimestreDe` (líneas 19-22) — ahora vive en `utils/periodo` y deriva de la fecha en vez de preferir la columna.

Cambiar la firma y los dos primeros defs:

```ts
export function actividadFilters({ t, nombrePorId, intlLocale }: Deps): FilterDef<Actividad>[] {
  return [
    { key: 'trimestre', labelKey: 'stratix.filter.allQuarters',
      options: () => QUARTERS,
      match: (a, v) => trimestreDe(a.fecha_inicio) === v },
    // Los 12 meses de cada año presente, no los que tienen tareas: el tablero se usa para ver
    // que un mes está vacío, y una opción que desaparece cuando no hay tareas no permite
    // preguntarlo. Antes eran 12 fijos porque el mes no tenía año.
    { key: 'periodo', labelKey: 'stratix.filter.allMonths',
      options: items => periodosDisponibles(items.map(a => a.fecha_inicio)),
      optionLabel: p => periodoLargo(`${p}-01`, intlLocale),
      match: (a, v) => claveMes(a.fecha_inicio) === v },
```

El resto de los defs (estado, empresa, responsable) queda **sin tocar**.

- [ ] **Step 4: Correr los tests y verlos pasar**

Run: `pnpm test src/features/stratix-mkt/utils/act-filters`
Expected: PASS

- [ ] **Step 5: Preparar el commit**

```bash
git add src/features/stratix-mkt/utils/act-filters/
git commit -m "feat(stratix): el filtro de trimestre deriva de la fecha y el de mes lleva anio"
```

---

### Task 6: El reporte — hook, pantalla y el "2026" clavado

`ReporteTab:66` imprime literalmente `{mesReporte} 2026`. Es el año hardcodeado en la cabecera de un reporte de pago.

**Files:**
- Modify: `src/features/stratix-mkt/hooks/useReporte/index.ts:2,19`
- Modify: `src/features/stratix-mkt/components/reporte/ReporteTab/index.tsx:2,52-53,66`

**Interfaces:**
- Consumes: `periodoLargo`, `periodosDisponibles` de `utils/periodo`; `localMonth` de `@/shared/utils/dates`
- Produces: `reporte.mesReporte` en formato `'YYYY-MM'`

- [ ] **Step 1: El hook arranca en el mes corriente con su año**

En `src/features/stratix-mkt/hooks/useReporte/index.ts`:

Línea 2:

```ts
import { useApp } from '@/shared/context/AppContext'
```

Agregar el import:

```ts
import { localMonth } from '@/shared/utils/dates'
```

Línea 19:

```ts
  const [criterios, setCriterios] = useState<ReporteCriterios>({ mes: localMonth(), miembroId: '' })
```

`mes: mesReporte` dentro de `reportHtml({…})` queda como está — `report-html` lo formatea en la Task 7.

- [ ] **Step 2: El selector ofrece períodos, no etiquetas**

En `src/features/stratix-mkt/components/reporte/ReporteTab/index.tsx`:

Línea 2:

```ts
import { useApp } from '@/shared/context/AppContext'
```

Agregar:

```ts
import { periodoLargo, periodosDisponibles } from '@/features/stratix-mkt/utils/periodo'
```

y sumar `intlLocale` a la desestructuración de `useT()`, y `actividades` a la de `useApp()`.

Reemplazar el `<select>` de las líneas 52-53 por:

```tsx
          <select className={s.select} value={mesReporte} onChange={e => setMesReporte(e.target.value)}>
            {periodosDisponibles(actividades.map(a => a.fecha_inicio)).map(p => (
              <option key={p} value={p}>{periodoLargo(`${p}-01`, intlLocale)}</option>
            ))}
          </select>
```

- [ ] **Step 3: Matar el año hardcodeado**

Línea 66, reemplazar:

```tsx
            <div className={s.valor}>{mesReporte} 2026</div>
```

por:

```tsx
            {/* El año salía escrito a mano: esta hoja decía "Enero 2026" en 2027. Ahora sale
                del período, que es el mismo dato con el que se filtró el reporte. */}
            <div className={s.valor}>{periodoLargo(`${mesReporte}-01`, intlLocale)}</div>
```

- [ ] **Step 4: Verificar que compila y que los tests siguen verdes**

Run: `pnpm typecheck && pnpm test`
Expected: sin errores en `useReporte` ni `ReporteTab`.

- [ ] **Step 5: Preparar el commit**

```bash
git add src/features/stratix-mkt/hooks/useReporte/ src/features/stratix-mkt/components/reporte/ReporteTab/
git commit -m "fix(stratix): la hoja del reporte deja de tener el anio 2026 escrito a mano"
```

---

### Task 7: La hoja imprimible

**Files:**
- Modify: `src/features/stratix-mkt/utils/report-html/index.ts:9,36`
- Modify: `src/features/stratix-mkt/hooks/useReporte/index.ts:39-49`

**Interfaces:**
- Consumes: `periodoLargo` de `utils/periodo`
- Produces: `reportHtml({ …, mes, intlLocale })` — el tipo `Datos` gana `intlLocale: string`

- [ ] **Step 1: Formatear el período de cada fila**

En `type Datos`, agregar debajo de `mes: string`:

```ts
  intlLocale: string // para nombrar el período en el idioma de quien imprime
```

En la firma de `reportHtml`, agregar `intlLocale` a la desestructuración.

Línea 36, reemplazar:

```ts
      <td style="${celda};color:#555;text-align:center">${escapeHtml(a.mes || '')}</td>
```

por:

```ts
      <td style="${celda};color:#555;text-align:center">${escapeHtml(periodoLargo(a.fecha_inicio, intlLocale, 'short'))}</td>
```

Agregar el import arriba:

```ts
import { periodoLargo } from '@/features/stratix-mkt/utils/periodo'
```

- [ ] **Step 2: Pasarle el locale desde el hook**

En `src/features/stratix-mkt/hooks/useReporte/index.ts`, dentro de `reportHtml({…})`, agregar:

```ts
      intlLocale,
```

y sumar `intlLocale` a la desestructuración de `useT()`.

- [ ] **Step 3: Verificar que compila**

Run: `pnpm typecheck`
Expected: sin errores en `report-html` ni `useReporte`.

- [ ] **Step 4: Preparar el commit**

```bash
git add src/features/stratix-mkt/utils/report-html/ src/features/stratix-mkt/hooks/useReporte/
git commit -m "feat(stratix): la hoja imprimible nombra el periodo en el idioma de quien imprime"
```

---

### Task 8: El Kanban

**Files:**
- Modify: `src/features/stratix-mkt/hooks/useKanban/index.ts:14,18-19,42`
- Modify: `src/features/stratix-mkt/components/kanban/KanbanTab/index.tsx:12,21-23`
- Modify: `src/features/stratix-mkt/components/kanban/KanbanTaskCard/index.tsx:29-30`

**Interfaces:**
- Consumes: `claveMes`, `periodoLargo` de `utils/periodo`
- Produces: `kanban.periodosConTareas: string[]` (`'YYYY-MM'`), `kanban.periodoKanban`, `kanban.setPeriodoKanban` — reemplazan a `mesesDisponibles`/`mesKanban`/`setMesKanban`. Se llama `periodosConTareas` y no `periodosDisponibles` a propósito: ofrece **sólo los que tienen tareas**, al revés que `periodosDisponibles()` de `utils/periodo`, que ofrece los 12 de cada año. Dos nombres distintos porque son dos criterios distintos.

- [ ] **Step 1: El hook agrupa por período**

En `src/features/stratix-mkt/hooks/useKanban/index.ts`, reemplazar la línea 14 por:

```ts
  const [periodoKanban, setPeriodoKanban] = useState('')
```

y las líneas 18-19 por:

```ts
  // Los períodos que REALMENTE tienen tareas, más reciente primero: este selector es para saltar
  // a un mes cargado, no para descubrir uno vacío (eso lo hace el panel de filtros del tablero).
  // Por eso NO usa `periodosDisponibles()` de utils/periodo, que ofrece los 12 de cada año.
  const periodosConTareas = [...new Set(actividades.map(a => claveMes(a.fecha_inicio)).filter(Boolean))].sort().reverse()
  const actsKanban = periodoKanban ? actividades.filter(a => claveMes(a.fecha_inicio) === periodoKanban) : actividades
```

En el objeto `kanban` del final (línea 42), reemplazar `mesKanban, setMesKanban, mesesDisponibles,` por:

```ts
    periodoKanban, setPeriodoKanban, periodosConTareas,
```

Agregar el import:

```ts
import { claveMes } from '@/features/stratix-mkt/utils/periodo'
```

Actualizar el comentario de la marca `centinela-exime: useState@1` (líneas 12-13): sigue siendo válida —el filtro de período y el gesto de arrastre no se tocan— pero dice "el filtro de mes", que ahora es de período.

- [ ] **Step 2: El selector muestra el período con su año**

En `src/features/stratix-mkt/components/kanban/KanbanTab/index.tsx`, línea 12, cambiar la desestructuración a `periodoKanban, setPeriodoKanban, periodosConTareas`, y reemplazar las líneas 21-23 por:

```tsx
          <select className={s.select} value={periodoKanban} onChange={e => setPeriodoKanban(e.target.value)}>
            <option value="">{t('stratix.allMonths')}</option>
            {periodosConTareas.map(p => (
              <option key={p} value={p}>{periodoLargo(`${p}-01`, intlLocale)}</option>
            ))}
          </select>
```

Agregar el import de `periodoLargo` y `intlLocale` a `useT()`.

- [ ] **Step 3: La tarjeta muestra el período corto**

En `src/features/stratix-mkt/components/kanban/KanbanTaskCard/index.tsx`, reemplazar las líneas 29-30 por:

```tsx
        {a.fecha_inicio && <span className={s.separador}>/</span>}
        {a.fecha_inicio && <span className={s.periodo}>{periodoLargo(a.fecha_inicio, intlLocale, 'short')}</span>}
```

Agregar el import de `periodoLargo` y `intlLocale` de `useT()`.

- [ ] **Step 4: Verificar que compila**

Run: `pnpm typecheck`
Expected: sin errores en los tres archivos.

- [ ] **Step 5: Preparar el commit**

```bash
git add src/features/stratix-mkt/hooks/useKanban/ src/features/stratix-mkt/components/kanban/
git commit -m "feat(stratix): el kanban filtra y muestra el periodo con su anio"
```

---

### Task 9: El tablero y la gráfica por mes

La gráfica dibuja 12 barras. Con año en juego pasarían a ser 12 por año, y en 2027 serían 24 apretadas. Se dibujan los 12 meses de **un** año: el del filtro puesto, o el corriente.

**Files:**
- Modify: `src/features/stratix-mkt/hooks/useTablero/index.ts:1,25,50-59,114`
- Modify: `src/features/stratix-mkt/components/overview/OverviewTab/index.tsx:77`

**Interfaces:**
- Consumes: `claveMes`, `periodoLargo` de `utils/periodo`
- Produces: `datosPorMes: { mes: string; key: string; total: number; completadas: number }[]` donde `key` es `'YYYY-MM'`; `tablero.anioGrafica: string`

- [ ] **Step 1: La gráfica se ancla a un año**

En `src/features/stratix-mkt/hooks/useTablero/index.ts`:

Línea 1:

```ts
import { useApp } from '@/shared/context/AppContext'
```

Agregar el import:

```ts
import { claveMes, periodoLargo } from '@/features/stratix-mkt/utils/periodo'
```

Línea 25, pasarle el locale a los filtros:

```ts
  const actFilters = actividadFilters({ t, nombrePorId: miembrosPorId, intlLocale })
```

y sumar `intlLocale` a la desestructuración de `useT()`.

Reemplazar las líneas 50-59 por:

```ts
  // Los 12 meses de UN año: el eje no cambia de largo según el filtro, así que un mes vacío se
  // ve vacío en vez de desaparecer. El año es el del filtro de período si hay uno puesto, y el
  // corriente si no — elegir otro año es elegir un período de ese año en el panel de filtros.
  // ponytail: un selector de año propio se agrega el día que alguien quiera comparar dos años
  // lado a lado; hoy no hay dos años de datos.
  const actsPorMes = exceptOwn('periodo')
  const anioGrafica = (filterValues.periodo ?? '').slice(0, 4) || String(hoy.getFullYear())
  const datosPorMes = Array.from({ length: 12 }, (_, i) => {
    const key = `${anioGrafica}-${String(i + 1).padStart(2, '0')}`
    const delMes = actsPorMes.filter(a => claveMes(a.fecha_inicio) === key)
    return {
      mes: periodoLargo(`${key}-01`, intlLocale, 'short').split(' ')[0],
      key,
      total: delMes.length,
      completadas: delMes.filter(a => a.estado === ESTADO.COMPLETADO).length,
    }
  })
```

`const hoy = new Date()` ya está declarado en la línea 45, arriba de este bloque: se reusa, no se
redeclara. Agregar `anioGrafica` al objeto `tablero` que se retorna (línea 114 y siguientes).

- [ ] **Step 2: El clic en una barra filtra por período**

En `src/features/stratix-mkt/components/overview/OverviewTab/index.tsx`, línea 77, reemplazar:

```tsx
          onSelect={toggle('mes')} selected={filterValues.mes} />
```

por:

```tsx
          onSelect={toggle('periodo')} selected={filterValues.periodo} />
```

La línea 44 (`mesesData`) no cambia: `d.mes` sigue siendo la etiqueta corta y `d.key` el valor canónico.

- [ ] **Step 3: Verificar que compila y que todo el suite pasa**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 4: Preparar el commit**

```bash
git add src/features/stratix-mkt/hooks/useTablero/ src/features/stratix-mkt/components/overview/OverviewTab/
git commit -m "feat(stratix): la grafica por mes se ancla a un anio y filtra por periodo"
```

---

### Task 10: La ficha y la tabla de Requests

Tres campos de la ficha (Mes, Trimestre, Semana) pasan a dos: Inicio y Trimestre. `semana` desaparece sin reemplazo — es la decisión del diseño.

**Files:**
- Modify: `src/features/stratix-mkt/utils/act-detail-fields/grupos/periodo.ts` (completo)
- Modify: `src/features/stratix-mkt/components/solicitudes/TaskTableRow/index.tsx:33`
- Modify: `src/shared/i18n/locales/es.json`, `src/shared/i18n/locales/en.json`
- Test: `src/features/stratix-mkt/utils/act-detail-fields/index.test.ts`

**Interfaces:**
- Consumes: `trimestreDe` de `utils/periodo`; `fechaCorta` de `@/shared/utils/dates`; `Deps.locale` (ya existe en `act-detail-fields/tipos.ts`)
- Produces: `grupoPeriodo(a, deps)` con dos campos: inicio y trimestre

- [ ] **Step 1: Agregar la clave i18n**

En `src/shared/i18n/locales/es.json`, junto a `"stratix.detail.quarter"`:

```json
  "stratix.detail.start": "Inicio",
```

En `src/shared/i18n/locales/en.json`:

```json
  "stratix.detail.start": "Start",
```

**No borrar** `stratix.detail.week` todavía: se borra en la fase 2, junto con la columna.

- [ ] **Step 2: Escribir el test que falla**

Agregar a `src/features/stratix-mkt/utils/act-detail-fields/index.test.ts`:

```ts
import { grupoPeriodo } from './grupos/periodo'

describe('grupoPeriodo', () => {
  const deps = { t: ((k: string) => k) as never, locale: 'es-EC', miembrosPorId: {} }

  it('muestra la fecha de inicio y el trimestre derivado', () => {
    const g = grupoPeriodo({ fecha_inicio: '2026-03-17' }, deps)
    expect(g.campos).toHaveLength(2)
    expect(g.campos[0].value).toMatch(/2026/)
    // Marzo es Q1. La columna decía Q2 en 45 filas.
    expect(g.campos[1].value).toBe('Q1')
  })

  it('sin fecha, los dos campos se marcan vacíos en vez de inventar un Q1', () => {
    const g = grupoPeriodo({ fecha_inicio: null }, deps)
    expect(g.campos.every(c => c.vacio)).toBe(true)
  })
})
```

- [ ] **Step 3: Correrlo y ver que falla**

Run: `pnpm test src/features/stratix-mkt/utils/act-detail-fields`
Expected: FAIL — `g.campos` tiene 3 elementos y el primero es `a.mes`, que es `undefined`.

- [ ] **Step 4: Reescribir el grupo**

Reemplazar `src/features/stratix-mkt/utils/act-detail-fields/grupos/periodo.ts` completo por:

```ts
import { fechaCorta } from '@/shared/utils/dates'
import { trimestreDe } from '@/features/stratix-mkt/utils/periodo'
import { campo, type Deps, type GrupoCampos } from '../tipos'
import type { Actividad } from '@/features/stratix-mkt/types'

// Cuándo empieza el trabajo, y el trimestre que sale de ahí. Eran tres campos —Mes, Trimestre y
// Semana— y son dos: la fecha ya trae mes y año, y el trimestre se calcula. `semana` se fue con
// su columna: no la leía ningún filtro ni el reporte.
//
// El fallback `|| 'Q1'` que había acá INVENTABA un trimestre para una fila sin mes, y ese dato
// después se sumaba. Sin fecha, los dos campos se marcan vacíos y la ficha los atenúa.
//
// Ojo con lo migrado del Google Sheet: esas 251 filas llevan el día 1 como marcador, porque el
// Sheet declaraba el mes y no el día.
export function grupoPeriodo(a: Actividad, { t, locale }: Deps): GrupoCampos {
  const trimestre = trimestreDe(a.fecha_inicio)
  return {
    titulo: t('stratix.detail.grupoPeriodo'),
    campos: [
      campo(t('stratix.detail.start'), a.fecha_inicio ? fechaCorta(a.fecha_inicio, locale) : '—', !a.fecha_inicio),
      campo(t('stratix.detail.quarter'), trimestre || '—', !trimestre),
    ],
  }
}
```

- [ ] **Step 5: Correr los tests y verlos pasar**

Run: `pnpm test src/features/stratix-mkt/utils/act-detail-fields`
Expected: PASS

- [ ] **Step 6: La columna de la tabla de Requests**

En `src/features/stratix-mkt/components/solicitudes/TaskTableRow/index.tsx`, línea 33:

```tsx
      <td className={s.td}>{periodoLargo(a.fecha_inicio, intlLocale, 'short')}</td>
```

Agregar el import de `periodoLargo` y `intlLocale` de `useT()`.

- [ ] **Step 7: Verificar y preparar el commit**

Run: `pnpm typecheck && pnpm test`

```bash
git add src/features/stratix-mkt/utils/act-detail-fields/ src/features/stratix-mkt/components/solicitudes/TaskTableRow/ src/shared/i18n/locales/
git commit -m "feat(stratix): la ficha muestra inicio y trimestre derivado, y suelta semana"
```

---

### Task 11: Sacar el selector del formulario

El punto de todo el cambio: no se elige un dato que ya sabe el calendario. En producción, 78 de 78 tareas creadas por la app tenían el mes corriente.

**Files:**
- Modify: `src/features/stratix-mkt/components/modals/ActivityNumeros/index.tsx` (completo)
- Modify: `src/features/stratix-mkt/components/modals/ActivityNumeros/index.module.css`
- Modify: `src/features/stratix-mkt/utils/act-form.ts:1,7-9,17`
- Test: `src/features/stratix-mkt/utils/act-form.test.ts`

**Interfaces:**
- Consumes: `localDate` de `@/shared/utils/dates`
- Produces: `actividadAForm(a)` devuelve `fecha_inicio: 'YYYY-MM-DD'` en vez de `mes: 'Agosto'`

- [ ] **Step 1: Ajustar el test de `act-form`**

En `src/features/stratix-mkt/utils/act-form.test.ts`, reemplazar las líneas 3-5 por:

```ts
import { localDate } from '@/shared/utils/dates'

const hoy = localDate()
```

y en los casos que comparan `mes`, cambiar la propiedad a `fecha_inicio`. Agregar:

```ts
it('una actividad sin fecha de inicio cae a hoy, no a un mes inventado', () => {
  expect(actividadAForm({ titulo: 'x' }).fecha_inicio).toBe(localDate())
})

it('respeta la fecha de una actividad existente, aunque sea de otro año', () => {
  expect(actividadAForm({ titulo: 'x', fecha_inicio: '2026-03-17' }).fecha_inicio).toBe('2026-03-17')
})
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `pnpm test src/features/stratix-mkt/utils/act-form`
Expected: FAIL — `actividadAForm` devuelve `mes`, no `fecha_inicio`.

- [ ] **Step 3: Cambiar el mapeo**

En `src/features/stratix-mkt/utils/act-form.ts`, reemplazar la línea 1 por:

```ts
import { localDate } from '@/shared/utils/dates'
```

y la línea 17 por:

```ts
  fecha_inicio: a.fecha_inicio || localDate(),
```

Reemplazar la parte del comentario de cabecera que habla del mes (líneas 7-9) por:

```ts
// form trabaja con strings; los nulos caen a ''. Una actividad sin `fecha_inicio` (no debería
// existir: la columna es NOT NULL) cae a hoy, que es el mismo default que pone la base.
```

- [ ] **Step 4: Correr los tests y verlos pasar**

Run: `pnpm test src/features/stratix-mkt/utils/act-form`
Expected: PASS

- [ ] **Step 5: Borrar el `<select>` de mes**

Reemplazar `src/features/stratix-mkt/components/modals/ActivityNumeros/index.tsx` completo por:

```tsx
'use client'
import { Field } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — sale de `NewActivityModal`, que pasaba el techo de 150.
// Cuánto esfuerzo lleva la tarea: las horas suman en el reporte de pago y los días dibujan la
// barra del Gantt.
//
// El selector de mes se fue el 31/08. Era un dato que ya sabía el calendario: en 78 de 78 tareas
// creadas por la app, el mes imputado era el mes en que se creó la tarea — nadie eligió nunca
// otro. Ahora lo pone el DEFAULT de `actividades.fecha_inicio`, y sigue siendo editable en la
// ficha para el día que alguien cargue una tarea tarde.
export default function ActivityNumeros() {
  const { t } = useT()
  const { nuevaAct, setNuevaAct } = useStratix()

  return (
    <div className={s.dos}>
      <Field icon="⏱" label={t('stratix.new.hours')}>
        <input type="number" min="0" placeholder="0" value={nuevaAct.horas}
          onChange={e => setNuevaAct(p => ({ ...p, horas: e.target.value }))} />
      </Field>
      <Field icon="📆" label={t('stratix.new.days')}>
        <input type="number" min="0" placeholder="0" value={nuevaAct.dias_produccion}
          onChange={e => setNuevaAct(p => ({ ...p, dias_produccion: e.target.value }))} />
      </Field>
    </div>
  )
}
```

La marca `centinela-exime: select-con-default@2` se borra con el `<select>` que la justificaba. La
marca `bloques-similares@2` **se queda**: sigue siendo el bloque que salió de `NewActivityModal`.

**Sacar también la fila de la exención muerta**, que vive en el repo de datos del centinela y **no
en este repo**: `~/.local/share/centinela/EXENCIONES.md`, línea 52 —
`` `EminatMKT/eminat-app` | `…/ActivityNumeros/index.tsx` | `select-con-default@2` ``. Una marca
sin uso es una exención que sigue firmada. Ese archivo se commitea en **su** repo, con su propio
remoto, no en el de la app.

- [ ] **Step 6: Ajustar el CSS de tres columnas a dos**

En `src/features/stratix-mkt/components/modals/ActivityNumeros/index.module.css`, renombrar la clase `.tres` a `.dos` y cambiar su `grid-template-columns` de tres columnas a dos. Las medidas van en `rem`, no en píxeles.

- [ ] **Step 7: Verificar y preparar el commit**

Run: `pnpm typecheck && pnpm test && pnpm lint:css`

```bash
git add src/features/stratix-mkt/utils/act-form.ts src/features/stratix-mkt/utils/act-form.test.ts src/features/stratix-mkt/components/modals/ActivityNumeros/
git commit -m "feat(stratix): se va el selector de mes — la fecha la pone el calendario"
```

---

### Task 12: Gate completo y QA en local

**Files:** ninguno — es verificación.

- [ ] **Step 1: El gate**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm lint:css && pnpm build:check`
Expected: todo verde. **Si algo falla, se arregla acá y no se sigue.**

- [ ] **Step 2: Confirmar que no quedó ninguna lectura de las columnas viejas**

Run:

```bash
grep -rn "\.mes\b\|\.trimestre\b\|\.semana\b\|sheet_row" src/features/stratix-mkt src/shared/context src/shared/data
```

Expected: los únicos aciertos son las **escrituras** transitorias de la Task 3 (`useActividadForm`) y el tipo `Actividad`. Ninguna lectura. `src/features/cobranzas` y `src/features/accounting` tienen su propio `mes` y **no se tocan**.

- [ ] **Step 3: QA en el navegador**

Levantar `pnpm dev` y recorrer, con una cuenta `stratix360` (no admin):

1. **Nueva tarea** — el formulario ya no tiene selector de mes. Crearla y verificar en la ficha que la fecha de inicio es hoy.
2. **Reporte de pago** — elegir agosto de 2026. Las 71 tareas de agosto tienen que dar las mismas horas y días que antes de la migración (agosto es el único mes que hoy no está contaminado por el bug del año).
3. **Imprimir el reporte** — la cabecera dice el período real, no "… 2026" fijo.
4. **Filtro de trimestre** — elegir Q1 y comprobar que las tareas de marzo aparecen (antes 45 de ellas estaban marcadas Q2 y no salían).
5. **Gráfica por mes** — clic en una barra filtra el tablero; clic de nuevo lo saca.
6. **Kanban** — el selector muestra los períodos con año.
7. **Cambiar el idioma a inglés** — el período dice "August 2026", no "Agosto".
8. **Una tarea vieja del Sheet** — la ficha muestra el día 1 como inicio. Es lo esperado.

- [ ] **Step 4: El push a producción**

Antes: el backup y el precheck de `rules/base-de-datos.md`. **Confirmar con Wagner antes de correrlo.**

```bash
pnpm supabase link --project-ref ruedelunbtaomhrzgelc
pnpm supabase db push
```

- [ ] **Step 5: Verificar el backfill contra el testigo, en producción**

```sql
select count(*) desviadas
  from actividades
 where mes is not null
   and extract(month from fecha_inicio)::int <> array_position(
         array['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'], mes)::int;
```

Expected: `0`. **Éste es el criterio para habilitar la fase 2.** Si no da cero, la fase 2 no se hace y se revisa el backfill.

---

## Fase 2 — el drop

> **No arrancar hasta que:** la fase 1 esté en producción, el `SELECT` de verificación dé cero, y **haya salido un ciclo de reporte de pago real** con las cifras esperadas. Wagner confirma las dos cosas.

### Task 13: Borrar las cuatro columnas

**Files:**
- Create: `supabase/migrations/<timestamp>_actividades_drop_derivadas.sql`
- Modify: `src/features/stratix-mkt/hooks/useActividadForm/index.ts` (sacar la escritura transitoria)
- Modify: `src/shared/context/loadAppData.ts` (sacar `mes` y `semana` del tipo)
- Modify: `src/shared/constants/domain.ts` (borrar `mesATrimestre`)
- Modify: `src/shared/data/actividades.ts:27` (el comentario de `updateFecha`)
- Modify: `src/shared/i18n/locales/{es,en}.json` (borrar `stratix.detail.week`)
- **Drop:** las vistas `v_kpis_globales` y `v_produccion_responsable` — dependen de `mes` y
  `trimestre`, y no las consulta nadie. Sin esto el `DROP COLUMN` falla.

- [ ] **Step 1: La migración**

```bash
pnpm supabase migration new actividades_drop_derivadas
```

Contenido:

```sql
-- Se van las columnas derivadas y muertas de `actividades`, verificadas contra `fecha_inicio` en
-- producción (ver la fase 1: docs/superpowers/plans/2026-08-31-fecha-inicio.md).
--
--   mes        — el texto 'Agosto' sin año. Su reemplazo es el mes de `fecha_inicio`.
--   trimestre  — función pura del mes, y aun así se guardaba: 45 de 329 filas lo tenían
--                desincronizado (marzo marcado Q2). Ahora se calcula en `utils/periodo`.
--   semana     — no la leía ningún filtro ni el reporte. Resto del Google Sheet.
--   sheet_row  — número de fila del Google Sheet original, para verificar aquella migración.
--
-- PRIMERO las dos vistas, o el DROP COLUMN falla.
--
-- `v_kpis_globales` y `v_produccion_responsable` seleccionan `mes` y `trimestre` y AGRUPAN por
-- ellos: Postgres se niega a borrar una columna de la que depende una vista. No se usa CASCADE
-- —que las borraría en silencio—, se las borra a mano y con nombre.
--
-- Se pueden borrar porque NADIE las consulta: `src/shared/data/tables.ts` sólo registra
-- `v_equipo_hoy`, y un grep por sus nombres en `src/`, `e2e/` y `supabase/` sólo las encuentra en
-- los dumps de rollback. Son vistas muertas construidas sobre columnas muertas.
--
-- Y de paso cierran dos tercios de una fuga: ninguna de las tres vistas tiene `security_invoker`,
-- así que corren como su dueño (postgres) y NO aplican la RLS de las tablas que leen — y `anon`
-- tiene SELECT sobre las tres. Probado en local: `anon` lee 0 filas de `actividades` pero sí lee
-- nombres, roles, horas y conteos por las vistas. `v_equipo_hoy` sigue con esa fuga y se arregla
-- en su propio ítem: NO es parte de este cambio.

DROP VIEW IF EXISTS public.v_kpis_globales;
DROP VIEW IF EXISTS public.v_produccion_responsable;

-- Los CHECK y los índices (`idx_actividades_mes`, `idx_actividades_trimestre`) caen solos con sus
-- columnas. El filtro nuevo no lleva índice: son 329 filas y se filtran en el cliente.
ALTER TABLE public.actividades
  DROP COLUMN IF EXISTS mes,
  DROP COLUMN IF EXISTS trimestre,
  DROP COLUMN IF EXISTS semana,
  DROP COLUMN IF EXISTS sheet_row;
```

- [ ] **Step 2: Aplicarla en local**

Run: `pnpm supabase migration up`
Expected: aplica sin error.

- [ ] **Step 3: Sacar la escritura transitoria del payload**

En `src/features/stratix-mkt/hooks/useActividadForm/index.ts`, borrar del `payload` las dos líneas de `mes` y `trimestre` con su comentario, y la constante `MESES_TESTIGO`. Queda sólo `fecha_inicio: valores.fecha_inicio,`. Sacar `claveMes` y `trimestreDe` del import si ya no se usan.

- [ ] **Step 4: Limpiar el tipo, la constante y el comentario**

En `src/shared/context/loadAppData.ts`, borrar de `Actividad` las líneas `mes?: string` y `semana?: string`, y ajustar el comentario de `fecha_inicio` (ya no hay testigo).

En `src/shared/constants/domain.ts`, borrar `mesATrimestre` — su único consumidor era Stratix. `MESES` y `MESES_Q` **se quedan**: los usa Cobranzas.

En `src/shared/data/actividades.ts`, reemplazar el comentario de `updateFecha`:

```ts
// Corrige la fecha de entrega. Existe porque una fecha mal cargada no tenía arreglo desde
// la app: doce filas con el año 0206 colgaron el Gantt durante meses y nadie podía tocarlas
// (se corrigieron en la migración de `fecha_inicio`, el 31/08).
// NO toca `fecha_inicio`: cuándo empieza el trabajo —y con eso a qué mes se imputa el pago— es
// una decisión aparte de cuándo se entrega la tarea.
```

En `src/shared/i18n/locales/es.json` y `en.json`, borrar la clave `"stratix.detail.week"`.

- [ ] **Step 5: El gate**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm lint:css && pnpm build:check`
Expected: todo verde.

- [ ] **Step 6: Confirmar que las columnas no aparecen en ningún lado**

Run: `grep -rn "\bsemana\b\|sheet_row\|mesATrimestre" src/features/stratix-mkt src/shared`
Expected: cero aciertos.

- [ ] **Step 7: Confirmar que no quedó ninguna dependencia de las columnas en la base**

Antes de pushear a prod, correr en local:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
select viewname from pg_views
 where schemaname='public' and definition ~ '\mactividades\M';" -c "
select policyname from pg_policies
 where coalesce(qual::text,'')||coalesce(with_check::text,'') ~ '\m(mes|trimestre|semana|sheet_row)\M';" -c "
select column_name from information_schema.columns
 where table_name='actividades' and column_name in ('mes','trimestre','semana','sheet_row');"
```

Expected: la primera devuelve sólo `v_equipo_hoy`; las otras dos, cero filas.

**Ninguna policy de `actividades` nombra estas columnas** — las cinco gatean por
`has_module('stratix-mkt')` o `is_admin()`, verificado el 31/08. El trigger de auditoría
`log_cambio_actividad` sólo mira `estado` y `verificado`, así que tampoco se rompe.

- [ ] **Step 7: Preparar el commit y pushear a producción**

```bash
git add supabase/migrations/ src/
git commit -m "refactor(stratix): mueren mes, trimestre, semana y sheet_row"
```

Con la aprobación de Wagner, y con el backup y el precheck de `rules/base-de-datos.md` hechos:

```bash
pnpm supabase db push
```

---

## Notas de ejecución

**Qué NO toca este plan.** `src/features/cobranzas` y `src/features/accounting` tienen su propia
columna `mes` que no tiene nada que ver con ésta: `MESES` y `MESES_Q` siguen en
`src/shared/constants/domain.ts` porque esos dos módulos los usan. Lo único que se va de ahí es
`mesATrimestre`, en la Task 13.

**El Gantt queda como está.** Este cambio destraba la barra honesta (inicio → entrega en vez de la
estimación hacia atrás desde `dias_produccion`, `GanttBar/index.tsx:25`), pero eso es su propio
ítem: tocar el Gantt acá mezclaría dos cambios en el mismo diff.

**El orden importa entre la 1 y las demás, no entre las demás.** Las tareas 4 a 11 tocan archivos
disjuntos y sólo dependen de la 1 (el módulo) y la 3 (el tipo). La 2 (la migración) puede correr
en paralelo con el código: nada del código lee `fecha_inicio` hasta la 4.

**Si el guard de la migración aborta**, el problema es el backfill, no la migración. Correr el
`SELECT` del paso 5 de la Task 2 en local para ver qué filas se desviaron y por qué, y arreglar la
regla — no sacar el guard.

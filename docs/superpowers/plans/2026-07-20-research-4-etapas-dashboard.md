# Research — 4 etapas propias + dashboard ejecutivo · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplificar el pipeline del CRM Research a 4 etapas propias (`Nuevo` → `Contactado` → `Ganado`, + `Sin respuesta` archivada), con soporte multi-idioma en la capa de display, y limpiar el dashboard a una vista ejecutiva.

**Architecture:** Las etapas son un dominio propio del CRM (columna `research_leads.stage`), ya desacopladas de la fase clínica y del autocompletado de CT.gov. El **valor guardado es el literal canónico en español** (verdad de la DB, contra la que compara toda la lógica, el import y la migración manual); la **traducción vive solo en el render** vía claves i18n + un helper `stageLabel(stage, t)`. `Sin respuesta` es un estado archivado: no ocupa columna en el Kanban ni porción en el pie. Las secciones del dashboard que dirección pidió quitar se **comentan** (invocación + componente), no se borran.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · React · Recharts · custom i18n (`shared/i18n`, `t()` + JSON) · Vitest.

## Global Constraints

- **No migración de datos en código.** El remapeo de los valores viejos de `stage` en prod lo hace una persona a cargo, manual, por export/reimport CSV (`valueMap` del ImportModal). Ningún task escribe SQL ni toca datos.
- **Valor canónico = literal español.** El valor guardado en `research_leads.stage` son exactamente los strings de `PIPELINE_COLS`. Nunca guardar la traducción. La traducción es solo presentacional.
- **i18n paridad forzada por tsc.** `I18nKey = keyof typeof es`; `en` es `Record<I18nKey,string>`. Toda clave nueva va a **ambos** `es.json` y `en.json` o `pnpm typecheck` rompe. Default locale = `es`.
- **Comentar, no borrar** las secciones de dashboard que dirección mandó quitar (decisión Wagner 2026-07-20): comentar tanto la invocación como el componente, para restaurar fácil.
- **Convención de imports:** relativo intra-feature (`../constants`), alias `@/` solo cross-módulo (ej. `@/shared/i18n`).
- **Prohibido `any` nuevo** (regla Wagner 2026-07-20). Ningún task introduce `: any` / `as any`. Usar tipos concretos (`Record<string, number>`, etc.) o **tipado contextual** (params de callbacks tipados por la prop que los recibe, ej. el `formatter` de `<Tooltip>` de recharts → `(value, name) => ...` SIN anotación). El backlog de los ~138 `any` existentes es un ticket aparte en `.todo`, no se toca acá.
- **Etapas finales:** `['Nuevo','Contactado','Ganado','Sin respuesta']`. Colores: Nuevo `#60A5FA`, Contactado `#FBB040`, Ganado `#34D399`, Sin respuesta `#9494B3`. `Ganado` = desenlace positivo. `Sin respuesta` = archivado (fuera de Kanban/pie). Default de lead nuevo = `Nuevo`.
- Correr toda la suite con `pnpm test` (alias de `vitest run`), tipos con `pnpm typecheck`, build con `pnpm build`.

---

## File Structure

**Modificados:**
- `features/research/constants.ts` — fuente de verdad de etapas: `PIPELINE_COLS`, `PIPELINE_COLORS`, + nuevos `ARCHIVED_STAGE`, `PIPELINE_ACTIVE_COLS`, `DEFAULT_STAGE`, `STAGE_LABEL_KEY`, `stageLabel()`.
- `shared/i18n/locales/es.json` + `shared/i18n/locales/en.json` — 4 claves `research.stage.*`.
- `features/research/fields.ts` — `LeadFieldDef.optionLabelKey?` + asignarlo al campo `stage`.
- `features/research/components/leads/LeadFormField.tsx` — traducir el texto de las `<option>` si hay `optionLabelKey`.
- `features/research/components/StageBadge.tsx` — traducir la etiqueta (afecta LeadRow, OpportunityRow, NewsletterContactsStep).
- `features/research/components/leads/PipelineColumn.tsx` — traducir el header de columna.
- `features/research/components/leads/PipelineTab.tsx` — iterar `PIPELINE_ACTIVE_COLS` (excluir archivado).
- `features/research/components/StagePieChart.tsx` — traducir leyenda + tooltip.
- `features/research/hooks/useResearchData.ts` — `stageData` sobre `PIPELINE_ACTIVE_COLS`; reemplazar `awarded`/`inNeg` por `nuevos`/`contactados`/`ganados`; `activeLeads` = Nuevo+Contactado.
- `features/research/hooks/useResearchModals.ts` — `openNewLead` default `stage: DEFAULT_STAGE`.
- `features/research/importPlan.ts` — default `DEFAULT_STAGE` en inserts sin `stage`.
- `features/research/components/DashboardTab.tsx` — StatCards por etapa; comentar Leads by Country / Top Sponsors / Recently added.

**Comentados enteros (no borrados):**
- `features/research/components/CountryChip.tsx`
- `features/research/components/RecentLeadItem.tsx`

**Tests:**
- `features/research/index.test.ts` — describe nuevo para constantes + `stageLabel`.
- `features/research/importPlan.test.ts` — describe nuevo para el default de `stage`.

---

## Task 1: Constantes de etapas (fuente de verdad)

**Files:**
- Modify: `features/research/constants.ts:1` (import de tipo) y línea de `PIPELINE_COLS`/`PIPELINE_COLORS`
- Test: `features/research/index.test.ts`

**Interfaces:**
- Produces:
  - `PIPELINE_COLS: string[]` = `['Nuevo','Contactado','Ganado','Sin respuesta']`
  - `ARCHIVED_STAGE: string` = `'Sin respuesta'`
  - `PIPELINE_ACTIVE_COLS: string[]` = `['Nuevo','Contactado','Ganado']`
  - `DEFAULT_STAGE: string` = `'Nuevo'`
  - `PIPELINE_COLORS: Record<string,string>`
  - `STAGE_LABEL_KEY: Record<string, I18nKey>`
  - `stageLabel(stage: string | undefined, t: (k: I18nKey) => string): string`

- [ ] **Step 1: Escribir el test que falla** — agregar al final de `features/research/index.test.ts`:

```ts
import { PIPELINE_COLS, PIPELINE_ACTIVE_COLS, ARCHIVED_STAGE, DEFAULT_STAGE, STAGE_LABEL_KEY, stageLabel } from './constants'

describe('etapas del CRM (constantes + display)', () => {
  it('tiene exactamente las 4 etapas acordadas, en orden', () => {
    expect(PIPELINE_COLS).toEqual(['Nuevo', 'Contactado', 'Ganado', 'Sin respuesta'])
  })
  it('el archivado no entra al pipeline activo (Kanban/pie)', () => {
    expect(ARCHIVED_STAGE).toBe('Sin respuesta')
    expect(PIPELINE_ACTIVE_COLS).toEqual(['Nuevo', 'Contactado', 'Ganado'])
    expect(PIPELINE_ACTIVE_COLS).not.toContain(ARCHIVED_STAGE)
  })
  it('el default de un lead nuevo es la primera etapa', () => {
    expect(DEFAULT_STAGE).toBe('Nuevo')
    expect(PIPELINE_COLS[0]).toBe(DEFAULT_STAGE)
  })
  it('cada etapa tiene una clave i18n de display', () => {
    for (const s of PIPELINE_COLS) expect(STAGE_LABEL_KEY[s]).toBeTruthy()
  })
  it('stageLabel traduce por clave y cae al literal crudo si no la hay', () => {
    const t = (k: any) => k // identidad: devuelve la clave
    expect(stageLabel('Nuevo', t)).toBe('research.stage.nuevo')
    expect(stageLabel('EtapaLegacyVieja', t)).toBe('EtapaLegacyVieja')
    expect(stageLabel(undefined, t)).toBe('—')
  })
})
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `pnpm test -- features/research/index.test.ts`
Expected: FAIL (`PIPELINE_ACTIVE_COLS`/`stageLabel` no existen; `PIPELINE_COLS` aún trae 9 etapas viejas).

- [ ] **Step 3: Implementar en `features/research/constants.ts`** — reemplazar las dos primeras líneas de export y agregar el bloque de etapas. Sustituir:

```ts
export const PIPELINE_COLS = ['Identificado', 'Calificado', 'Outreach', 'Contacto', 'Discovery/Feasibility', 'Docs', 'Negociación', 'Awarded', 'Cerrado']

export const PIPELINE_COLORS: Record<string, string> = { Identificado: '#9494B3', Calificado: '#60A5FA', Outreach: '#A78BFA', Contacto: '#F472B6', 'Discovery/Feasibility': '#FBB040', Docs: '#FB923C', 'Negociación': '#F87171', Awarded: '#34D399', Cerrado: '#7C6FF7' }
```

por:

```ts
import type { I18nKey } from '@/shared/i18n'

// Etapas propias del CRM (columna research_leads.stage). El VALOR guardado es este literal
// canónico en español; la traducción es solo de display (STAGE_LABEL_KEY / stageLabel).
export const PIPELINE_COLS = ['Nuevo', 'Contactado', 'Ganado', 'Sin respuesta']

// 'Sin respuesta' = archivado: no ocupa columna en el Kanban ni porción en el pie.
export const ARCHIVED_STAGE = 'Sin respuesta'
export const PIPELINE_ACTIVE_COLS = PIPELINE_COLS.filter(s => s !== ARCHIVED_STAGE)

// Etapa por defecto de un lead nuevo (form e import con celda vacía).
export const DEFAULT_STAGE = 'Nuevo'

export const PIPELINE_COLORS: Record<string, string> = { 'Nuevo': '#60A5FA', 'Contactado': '#FBB040', 'Ganado': '#34D399', 'Sin respuesta': '#9494B3' }

// Traducción SOLO de display de las etapas. Las keys son los valores canónicos guardados.
export const STAGE_LABEL_KEY: Record<string, I18nKey> = {
  'Nuevo': 'research.stage.nuevo',
  'Contactado': 'research.stage.contactado',
  'Ganado': 'research.stage.ganado',
  'Sin respuesta': 'research.stage.sin_respuesta',
}

// Etiqueta traducida de una etapa; cae al literal crudo si no hay clave (valores legacy sin migrar).
export function stageLabel(stage: string | undefined, t: (k: I18nKey) => string): string {
  const key = STAGE_LABEL_KEY[stage || '']
  return key ? t(key) : (stage || '—')
}
```

> Nota: `import type` es erased en build, sin riesgo de import circular (`shared/i18n` no importa research).

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `pnpm test -- features/research/index.test.ts`
Expected: el describe nuevo PASA. (Los tests viejos con `stage: 'Identificado'` siguen pasando: `validateLead` solo exige `stage` no-vacío, no que esté en `PIPELINE_COLS`.)

- [ ] **Step 5: Commit**

```bash
git add features/research/constants.ts features/research/index.test.ts
git commit -m "feat(research): 4 etapas propias del CRM (Nuevo/Contactado/Ganado/Sin respuesta) + helpers de display"
```

---

## Task 2: Claves i18n de las etapas (es + en)

**Files:**
- Modify: `shared/i18n/locales/es.json`
- Modify: `shared/i18n/locales/en.json`

**Interfaces:**
- Produces: claves `research.stage.nuevo`, `research.stage.contactado`, `research.stage.ganado`, `research.stage.sin_respuesta` en ambos locales. Habilitan `t()` de Task 1/3/5.

- [ ] **Step 1: Agregar las 4 claves en `shared/i18n/locales/es.json`** — insertar junto al bloque `research.*` (ej. después de la línea `"research.field.stage": ...`):

```json
  "research.stage.nuevo": "Nuevo",
  "research.stage.contactado": "Contactado",
  "research.stage.ganado": "Ganado",
  "research.stage.sin_respuesta": "Sin respuesta",
```

- [ ] **Step 2: Agregar las mismas claves en `shared/i18n/locales/en.json`** (mismo lugar):

```json
  "research.stage.nuevo": "New",
  "research.stage.contactado": "Contacted",
  "research.stage.ganado": "Won",
  "research.stage.sin_respuesta": "No response",
```

- [ ] **Step 3: Verificar paridad de tipos (el guard real de i18n)**

Run: `pnpm typecheck`
Expected: PASS. (Si falta la clave en un locale, `Record<I18nKey,string>` rompe acá.)

- [ ] **Step 4: Correr los tests (Task 1 ya referencia estas claves como strings)**

Run: `pnpm test -- features/research/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/i18n/locales/es.json shared/i18n/locales/en.json
git commit -m "i18n(research): claves de display de las 4 etapas (es/en)"
```

---

## Task 3: Traducir el display de la etapa (badge, header de columna, pie, select)

**Files:**
- Modify: `features/research/fields.ts` (tipo `LeadFieldDef` + campo `stage`)
- Modify: `features/research/components/leads/LeadFormField.tsx:18`
- Modify: `features/research/components/StageBadge.tsx`
- Modify: `features/research/components/leads/PipelineColumn.tsx:28`
- Modify: `features/research/components/StagePieChart.tsx`

**Interfaces:**
- Consumes: `stageLabel`, `STAGE_LABEL_KEY` (Task 1); claves i18n (Task 2).
- Produces: `LeadFieldDef.optionLabelKey?: Record<string, I18nKey>`.

- [ ] **Step 1: Extender `LeadFieldDef` y asignarlo al campo `stage`** — en `features/research/fields.ts`:

En la interfaz `LeadFieldDef`, agregar debajo de `options?: string[]`:

```ts
  // Traduce el texto visible de cada opción (value se mantiene canónico). Solo display.
  optionLabelKey?: Record<string, I18nKey>
```

Agregar el import de `STAGE_LABEL_KEY` a la línea de import de constants (queda `import { PIPELINE_COLS, NCT_COLUMN, STAGE_LABEL_KEY } from './constants'`), y en el def del campo `stage` agregar la prop:

```ts
  { column: 'stage', labelKey: 'research.field.stage', type: 'select', group: 'Estudio', options: PIPELINE_COLS, optionLabelKey: STAGE_LABEL_KEY, required: true },
```

- [ ] **Step 2: Traducir las `<option>` en `LeadFormField.tsx`** — reemplazar la línea 18:

```tsx
            {def.options?.map(o => <option key={o} value={o}>{o}</option>)}
```

por:

```tsx
            {def.options?.map(o => <option key={o} value={o}>{def.optionLabelKey?.[o] ? t(def.optionLabelKey[o]) : o}</option>)}
```

> `value={o}` sigue siendo el literal canónico; solo cambia el texto visible.

- [ ] **Step 3: Traducir `StageBadge.tsx`** — reemplazar el archivo entero:

```tsx
'use client'
import { RESEARCH_THEME } from '../theme'
import { PIPELINE_COLORS, stageLabel } from '../constants'
import { useT } from '@/shared/i18n'

// Badge de stage del pipeline (color por stage, texto traducido).
export default function StageBadge({ stage }: { stage?: string }) {
  const { t3 } = RESEARCH_THEME
  const { t } = useT()
  const color = PIPELINE_COLORS[stage || ''] || t3
  return (
    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${color}20`, color, fontWeight: 600, whiteSpace: 'nowrap' }}>{stageLabel(stage, t)}</span>
  )
}
```

> El color se sigue derivando del `stage` canónico. `'use client'` es necesario por el hook `useT`.

- [ ] **Step 4: Traducir el header de columna en `PipelineColumn.tsx`** — agregar el import de `useT` y `stageLabel`, el hook, y traducir el texto. Cambiar la línea 3 y 19, y la 28.

Línea 3 (`import { PIPELINE_COLORS } from '../../constants'`) → `import { PIPELINE_COLORS, stageLabel } from '../../constants'`
Agregar tras la línea 3: `import { useT } from '@/shared/i18n'`
Dentro del componente, tras `const { updateStage, setModalLead } = useResearch()`, agregar: `const { t } = useT()`
Línea 28: `<span style={{ fontSize: 11, fontWeight: 700, color: t1 }}>{col}</span>` → `<span style={{ fontSize: 11, fontWeight: 700, color: t1 }}>{stageLabel(col, t)}</span>`

- [ ] **Step 5: Traducir leyenda + tooltip en `StagePieChart.tsx`** — reemplazar el archivo entero:

```tsx
'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { RESEARCH_THEME } from '../theme'
import { PIPELINE_COLORS, CHART_COLORS, stageLabel } from '../constants'
import { useT } from '@/shared/i18n'
import StageLegendItem from './StageLegendItem'

export default function StagePieChart({ data }: { data: { name: string; value: number }[] }) {
  const { s1, border, accent } = RESEARCH_THEME
  const { t } = useT()
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Pipeline by Stage</div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
          {data.map((d, i) => <Cell key={i} fill={PIPELINE_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie><Tooltip formatter={(value, name) => [value, stageLabel(String(name), t)]} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {data.map(d => <StageLegendItem key={d.name} name={stageLabel(d.name, t)} value={d.value} color={PIPELINE_COLORS[d.name] || accent} />)}
      </div>
    </div>
  )
}
```

> `key={d.name}` y el lookup de color usan el `name` canónico; solo el texto mostrado se traduce. `StageLegendItem` no cambia.

- [ ] **Step 6: Verificar tipos y build**

Run: `pnpm typecheck && pnpm test`
Expected: PASS (tipos ok, suite verde).

- [ ] **Step 7: Verificación manual** (no hay harness de render para estos componentes)

Run: `pnpm dev` → abrir `/research`. En el form de lead, el `<select>` de etapa muestra las 4 etapas; con locale `en` (toggle de idioma) muestran New/Contacted/Won/No response. Los badges (tab Leads) y el header del Kanban también traducen. El `value` guardado sigue en español (verificar en el detail modal / export).

- [ ] **Step 8: Commit**

```bash
git add features/research/fields.ts features/research/components/leads/LeadFormField.tsx features/research/components/StageBadge.tsx features/research/components/leads/PipelineColumn.tsx features/research/components/StagePieChart.tsx
git commit -m "feat(research): traducir display de etapas (badge, columna, pie, select) — valor canónico intacto"
```

---

## Task 4: Kanban con etapas activas · pie FIEL a los valores reales de la tabla

**Decisión (Wagner 2026-07-20):** el dashboard debe ser un **espejo de la tabla**, independiente del estado de la migración. El pie NO cuenta contra la constante fija (eso ocultaría los leads con valores viejos/no-migrados): **agrupa por el `stage` real de cada lead**. Cada lead figura, tenga el valor que tenga. El **Kanban** sí queda acotado a las 3 etapas activas (es un tablero de flujo, no una métrica: una columna archivada/legacy no tiene sentido como destino de drag).

**Files:**
- Modify: `features/research/components/leads/PipelineTab.tsx:3,13,14`
- Modify: `features/research/hooks/useResearchData.ts:56`

**Interfaces:**
- Consumes: `PIPELINE_ACTIVE_COLS` (Task 1).
- Produces: `stageData: { name: string; value: number }[]` derivado de los valores reales (no de la constante).

- [ ] **Step 1: Kanban itera solo etapas activas** — en `PipelineTab.tsx`:

Línea 3: `import { PIPELINE_COLS } from '../../constants'` → `import { PIPELINE_ACTIVE_COLS } from '../../constants'`
Línea 13: `minWidth: PIPELINE_COLS.length * 180` → `minWidth: PIPELINE_ACTIVE_COLS.length * 180`
Línea 14: `{PIPELINE_COLS.map(col => (` → `{PIPELINE_ACTIVE_COLS.map(col => (`

> Ceiling conocido: un lead con `stage` legacy/no-migrado no aparece en ninguna columna del Kanban (el tablero solo tiene las 3 activas). Es workflow, no métrica — la migración manual lo resuelve. El pie (Step 2) sí lo muestra.

- [ ] **Step 2: El pie agrupa por los valores REALES de la tabla** — en `useResearchData.ts`, reemplazar la línea 56:

```ts
  const stageData = PIPELINE_COLS.map(s => ({ name: s, value: leads.filter(l => l.stage === s).length })).filter(d => d.value > 0)
```

por:

```ts
  // Fiel a la tabla: agrupa por el stage REAL de cada lead (migrado o no). Nada se oculta por
  // estado de migración; un valor legacy ('Awarded', etc.) aparece tal cual. null/'' → 'Sin etapa'.
  const stageData = Object.entries(leads.reduce((m: Record<string, number>, l) => {
    const s = (l.stage || '').trim() || 'Sin etapa'
    m[s] = (m[s] || 0) + 1
    return m
  }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
```

> No hace falta tocar el import de constants para esto. `StagePieChart` ya resuelve color por `PIPELINE_COLORS[name] || CHART_COLORS[i]` (fallback para valores desconocidos) y `stageLabel` cae al literal crudo si no hay clave i18n → un valor legacy se ve con su texto real y un color de fallback. El pie muestra **todas** las etapas presentes, incluida `Sin respuesta` y las no-migradas.

- [ ] **Step 3: Verificar**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 4: Verificación manual** — en `/research`: (a) el Kanban muestra 3 columnas (Nuevo/Contactado/Ganado); (b) el pie refleja la distribución real — si hay leads con valores viejos sin migrar, aparecen como porciones propias (no desaparecen). La suma de las porciones del pie = `totalLeads` (menos los `Sin etapa` si preferís que no cuenten — hoy sí cuentan como "Sin etapa").

- [ ] **Step 5: Commit**

```bash
git add features/research/components/leads/PipelineTab.tsx features/research/hooks/useResearchData.ts
git commit -m "feat(research): Kanban con 3 etapas activas; pie fiel a los valores reales de la tabla (no oculta no-migrados)"
```

---

## Task 5: Métricas del hook + StatCards del dashboard por etapa

**Files:**
- Modify: `features/research/hooks/useResearchData.ts:52-54,159`
- Modify: `features/research/components/DashboardTab.tsx:1-21`

**Interfaces:**
- Consumes: etapas de Task 1; claves i18n de Task 2.
- Produces (del hook): `activeLeads: number`, `nuevos: number`, `contactados: number`, `ganados: number`. Elimina `awarded`, `inNeg`.

- [ ] **Step 1: Reescribir las métricas rotas en `useResearchData.ts`** — reemplazar las líneas 52-54:

```ts
  const activeLeads = leads.filter(l => !['Cerrado', 'Awarded'].includes(l.stage || '')).length
  const awarded = leads.filter(l => l.stage === 'Awarded').length
  const inNeg = leads.filter(l => l.stage === 'Negociación').length
```

por:

```ts
  const activeLeads = leads.filter(l => l.stage === 'Nuevo' || l.stage === 'Contactado').length
  const nuevos = leads.filter(l => l.stage === 'Nuevo').length
  const contactados = leads.filter(l => l.stage === 'Contactado').length
  const ganados = leads.filter(l => l.stage === 'Ganado').length
```

- [ ] **Step 2: Actualizar el objeto de retorno del hook** — línea 159:

```ts
    totalLeads, activeLeads, awarded, inNeg,
```

por:

```ts
    totalLeads, activeLeads, nuevos, contactados, ganados,
```

- [ ] **Step 3: Reescribir las StatCards del dashboard** — en `DashboardTab.tsx`, agregar el import de `useT` tras la línea 8 (`import BarChartCard from './BarChartCard'`):

```tsx
import { useT } from '@/shared/i18n'
```

Reemplazar la línea 11-12 (hook + destructure):

```tsx
  const { s1, border, t1, t3 } = RESEARCH_THEME
  const { totalLeads, activeLeads, awarded, inNeg, stageData, phaseData, sponsorData, countrySorted, leads } = useResearch()
```

por:

```tsx
  const { s1, border, t1, t3 } = RESEARCH_THEME
  const { t } = useT()
  const { totalLeads, nuevos, contactados, ganados, stageData, phaseData } = useResearch()
```

Reemplazar el bloque de StatCards (líneas 16-21):

```tsx
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard label="Total Leads" value={totalLeads} color="#60A5FA" />
        <StatCard label="Active Leads" value={activeLeads} color="#34D399" />
        <StatCard label="Awarded" value={awarded} color="#FBB040" />
        <StatCard label="In Negotiation" value={inNeg} color="#F87171" />
      </div>
```

por:

```tsx
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard label="Total Leads" value={totalLeads} color="#7C6FF7" />
        <StatCard label={t('research.stage.nuevo')} value={nuevos} color="#60A5FA" />
        <StatCard label={t('research.stage.contactado')} value={contactados} color="#FBB040" />
        <StatCard label={t('research.stage.ganado')} value={ganados} color="#34D399" />
      </div>
```

> `t3`/`leads` pueden quedar sin usar tras Task 6; se resuelve al comentar los bloques (Task 6). Este task deja el archivo compilando porque `t3` sigue usándose en los bloques que aún no se comentan.
> **Fidelidad:** `Total Leads` (= `totalLeads` = `leads.length`) cuenta **todos** los leads, migrados o no → es fiel a la tabla. Las 3 tarjetas por etapa cuentan match exacto de las 4 canónicas; un lead con valor legacy no figura en esas 3 pero **sí** en Total y en el pie (Task 4, data-driven). Así ningún lead se pierde de vista.

- [ ] **Step 4: Verificar**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/research/hooks/useResearchData.ts features/research/components/DashboardTab.tsx
git commit -m "feat(research): StatCards del dashboard por etapa (Total/Nuevo/Contactado/Ganado); baja métricas de stages viejos"
```

---

## Task 6: Comentar (no borrar) las secciones que dirección quitó

**Files:**
- Modify: `features/research/components/DashboardTab.tsx` (imports + 3 bloques)
- Modify: `features/research/components/CountryChip.tsx` (comentar entero)
- Modify: `features/research/components/RecentLeadItem.tsx` (comentar entero)

**Interfaces:** ninguna nueva. Solo se retira consumo de `CountryChip`, `RecentLeadItem`, `countrySorted`, `sponsorData`, `leads` en el dashboard. `sponsorData`/`countryData`/`countrySorted` **se dejan** en el hook (no borrar).

- [ ] **Step 1: Comentar imports muertos en `DashboardTab.tsx`** — líneas 5-6:

```tsx
import CountryChip from './CountryChip'
import RecentLeadItem from './RecentLeadItem'
```

por:

```tsx
// import CountryChip from './CountryChip' // ponytail: oculto por pedido de dirección (reunión 2026-07-20) — restaurar descomentando esto + el bloque "Leads by Country"
// import RecentLeadItem from './RecentLeadItem' // ponytail: oculto por pedido de dirección — restaurar con el bloque "Recently added leads"
```

- [ ] **Step 2: Comentar el bloque "Leads by Country"** — envolver las líneas 23-29 (el `<div>` con "Leads by Country") en comentario JSX:

```tsx
      {/* Oculto por dirección (reunión 2026-07-20) — restaurar descomentando + reactivar imports/destructure de countrySorted:
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Leads by Country</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {countrySorted.map(([country, count]) => <CountryChip key={country} country={country} count={count} />)}
          {countrySorted.length === 0 && <span style={{ color: t3, fontSize: 12 }}>No country data</span>}
        </div>
      </div>
      */}
```

- [ ] **Step 3: Comentar "Top Sponsors" y "Recently added leads"** — reemplazar el bloque de grid final (líneas 36-43) por su versión comentada; ese grid queda vacío, así que se comenta entero:

```tsx
      {/* Oculto por dirección (reunión 2026-07-20) — Top Sponsors + Recently added. Restaurar descomentando + reactivar imports/destructure (sponsorData, leads, RecentLeadItem):
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BarChartCard title="Top Sponsors" data={sponsorData} vertical />
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, fontSize: 12, fontWeight: 600, color: t1 }}>Recently added leads</div>
          {leads.slice(0, 5).map(l => <RecentLeadItem key={l.id} lead={l} />)}
          {leads.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: t3, fontSize: 12 }}>No leads</div>}
        </div>
      </div>
      */}
```

> Tras esto, el dashboard queda: StatCards (4) + fila `StagePieChart` + `Leads by Phase` (líneas 31-34, intactas).

- [ ] **Step 4: Comentar `CountryChip.tsx` entero** — envolver todo el contenido del archivo en un bloque, con nota de restauración arriba:

```tsx
// ponytail: componente oculto por pedido de dirección (reunión 2026-07-20). No borrar — restaurar
// descomentando este archivo y su uso en DashboardTab ("Leads by Country"). Ver .todo Q1.
/*
<CONTENIDO ORIGINAL DEL ARCHIVO TAL CUAL>
*/
```

(pegar el contenido original entre `/*` y `*/` sin modificarlo).

- [ ] **Step 5: Comentar `RecentLeadItem.tsx` entero** — igual patrón que Step 4, nota apuntando al bloque "Recently added leads".

- [ ] **Step 6: Verificar que no queden referencias colgando**

Run: `pnpm typecheck && pnpm build`
Expected: PASS. (Si `t1`/`t3`/`s1`/`border` quedan sin uso tras comentar, TS con `noUnusedLocals` podría avisar — si el build falla por eso, comentar también esas vars del destructure de `RESEARCH_THEME` en `DashboardTab`, dejando solo las que usan las StatCards/charts: verificar cuáles siguen vivas antes de tocar.)

- [ ] **Step 7: Verificación manual** — `/research` tab Dashboard: se ven solo las 4 StatCards + pie de pipeline (3 categorías) + Leads by Phase. No aparecen Country / Top Sponsors / Recently added.

- [ ] **Step 8: Commit**

```bash
git add features/research/components/DashboardTab.tsx features/research/components/CountryChip.tsx features/research/components/RecentLeadItem.tsx
git commit -m "chore(research): ocultar (comentar, no borrar) Leads by Country, Top Sponsors y Recently added del dashboard"
```

---

## Task 7: Default `Nuevo` al crear y al importar

**Files:**
- Modify: `features/research/hooks/useResearchModals.ts:16`
- Modify: `features/research/importPlan.ts` (import + `buildImportPlan`)
- Test: `features/research/importPlan.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_STAGE` (Task 1).

- [ ] **Step 1: Escribir el test que falla** — agregar al final de `features/research/importPlan.test.ts`:

```ts
describe('default de stage en import', () => {
  const headers = ['nct_number', 'official_title', 'stage']
  const mapping = ['nct_number', 'official_title', 'stage']
  it('un insert sin stage arranca en Nuevo', () => {
    const plan = buildImportPlan({
      rows: [['NCT00000001', 'Estudio A', '']],
      mapping, existingByNct: new Map(), dupMode: 'update',
    })
    expect(plan.toInsert).toHaveLength(1)
    expect(plan.toInsert[0].stage).toBe('Nuevo')
  })
  it('un insert con stage explícito lo respeta', () => {
    const plan = buildImportPlan({
      rows: [['NCT00000002', 'Estudio B', 'Ganado']],
      mapping, existingByNct: new Map(), dupMode: 'update',
    })
    expect(plan.toInsert[0].stage).toBe('Ganado')
  })
  it('un update sin stage NO fuerza el default (no pisa el valor existente)', () => {
    const plan = buildImportPlan({
      rows: [['NCT00000003', 'Estudio C', '']],
      mapping, existingByNct: new Map([['NCT00000003', 'id-3']]), dupMode: 'update',
    })
    expect(plan.toUpdate).toHaveLength(1)
    expect(plan.toUpdate[0].values.stage ?? null).toBeNull()
  })
})
```

> Si `buildImportPlan` no está importado en el archivo de test, agregarlo al import existente de `./importPlan`.

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `pnpm test -- features/research/importPlan.test.ts`
Expected: FAIL (el insert sin stage hoy da `stage: null`, no `'Nuevo'`).

- [ ] **Step 3: Implementar el default en `importPlan.ts`** — cambiar el import de constants (línea 4) para sumar `DEFAULT_STAGE`:

```ts
import { normNct, DEFAULT_STAGE } from './constants'
```

En `buildImportPlan`, dentro del `for (const row of rows)`, después de la línea que descarta filas vacías (`if (!Object.values(values).some(v => v !== null)) continue`) y antes de resolver el `id`, agregar el default **solo para inserts**. Reemplazar el bloque:

```ts
    const id = existingByNct.get(normNct(values.nct_number))
    if (!id) { plan.toInsert.push(values); continue } // sin match (o sin NCT#) → insertar
```

por:

```ts
    const id = existingByNct.get(normNct(values.nct_number))
    if (!id) {
      // Insert: si el CSV no trae stage (columna ausente o celda vacía), arranca en la etapa default.
      if (values.stage == null) values.stage = DEFAULT_STAGE
      plan.toInsert.push(values)
      continue
    }
```

> Solo aplica a inserts. En updates no se toca `stage` (un CSV sin esa columna no debe pisar la etapa existente).

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `pnpm test -- features/research/importPlan.test.ts`
Expected: PASS.

- [ ] **Step 5: Default en el form de lead nuevo** — en `useResearchModals.ts`, agregar el import de constants arriba:

```ts
import { DEFAULT_STAGE } from '../constants'
```

y cambiar la línea 16:

```ts
  const openNewLead = () => { setNewLead({}); setEditingLead(null); setModalNewLead(true) }
```

por:

```ts
  const openNewLead = () => { setNewLead({ stage: DEFAULT_STAGE }); setEditingLead(null); setModalNewLead(true) }
```

> `openEditLead` no cambia: al editar se carga el lead real. El default es solo para altas nuevas.

- [ ] **Step 6: Verificar toda la suite + tipos**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Verificación manual** — en `/research`, "Nuevo lead": el select de etapa arranca en `Nuevo` (traducido según locale). Importar un CSV sin columna stage: los leads nuevos entran como `Nuevo`.

- [ ] **Step 8: Commit**

```bash
git add features/research/hooks/useResearchModals.ts features/research/importPlan.ts features/research/importPlan.test.ts
git commit -m "feat(research): default 'Nuevo' al crear lead y al importar (solo inserts)"
```

---

## Verificación final

- [ ] `pnpm typecheck && pnpm test && pnpm build` — todo verde.
- [ ] Manual en `/research`: form (4 etapas, default Nuevo, traducidas en en/es), Kanban (3 columnas activas), pie (3 categorías), badges traducidos, dashboard sin Country/Sponsors/Recently, `Sin respuesta` archivado fuera del tablero.
- [ ] El valor guardado en `research_leads.stage` es el literal español (verificar en export CSV).

---

## Self-Review

**Cobertura del spec (.todo Q1):**
- Etapas 4 fijas en constante → Task 1 ✓
- Multi-idioma capa de display (canónico español + i18n render) → Task 1 (helper) + 2 (claves) + 3 (aplicación) ✓
- Métricas viejas rotas (awarded/inNeg) → Task 5 ✓
- Dashboard: StatCards por etapa → Task 5 ✓; comentar (no borrar) Country/Sponsors/Recently → Task 6 ✓; pie **fiel a la tabla** (data-driven, no oculta no-migrados) → Task 4 ✓
- `Sin respuesta` fuera del **Kanban** (workflow) → Task 4 ✓ (en el pie sí aparece, por fidelidad a la tabla — decisión Wagner)
- Default `Nuevo` (form + import) → Task 7 ✓
- Migración manual / CT.gov ya desacoplado → fuera de alcance por diseño (Global Constraints) ✓

**Placeholders:** ninguno — todo el código y comandos son concretos.

**Consistencia de tipos:** `stageLabel(stage, t)`, `STAGE_LABEL_KEY`, `PIPELINE_ACTIVE_COLS`, `DEFAULT_STAGE` se definen en Task 1 y se consumen con la misma firma en Tasks 3/4/5/7. `optionLabelKey?: Record<string,I18nKey>` se define en Task 3 (fields) y se lee en LeadFormField con el mismo shape. `t: (k: I18nKey) => string` es asignable desde el `t` real de `useT()` (que acepta vars opcionales).

**Riesgo conocido:** `noUnusedLocals` puede quejarse en `DashboardTab` tras Task 6 (vars de tema sin uso). El Step 6.6 lo cubre con instrucción de verificar y comentar las vars sobrantes del destructure si el build falla.

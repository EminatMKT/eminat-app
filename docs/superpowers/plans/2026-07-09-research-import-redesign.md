# Rediseño de la ventana de importación de leads (Research) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modal de importación de leads por uno estilo Anki: separador elegible, field mapping manual columna→campo, y manejo de duplicados por NCT# (actualizar/saltar/duplicar).

**Architecture:** Parsing y planificación son módulos puros y testeables (`delimited.ts`, `importPlan.ts`); el match contra lo existente es client-side usando los leads ya en memoria (sin fetch ni migración). `ImportModal.tsx` es UI dumb que arma un `ImportPlan` y se lo pasa a `confirmImport`.

**Tech Stack:** Next.js 14 + React + TypeScript, Supabase (`researchRepo.insertLeads`/`updateLead`), vitest, i18n propio (`shared/i18n`, `useT`).

## Global Constraints

- **Sin dependencias nuevas.** Solo CSV/TSV texto; nada de xlsx binario (SheetJS descartado).
- **i18n obligatorio.** Todo texto de UI vía `t()`. `es.json` es la fuente; `en.json` debe tener EXACTAMENTE las mismas claves (lo fuerza `satisfies Record<I18nKey,string>` en `shared/i18n/index.tsx`). Nada de texto hardcodeado (lo flaggea `.githooks/check-i18n.mjs`).
- **Columnas reales.** Los payloads usan columnas reales de `research_leads` vía `coerceLeadValue`/`LEAD_FIELD_DEFS` de `features/research/fields.ts`. Match key = `nct_number` normalizado (`trim().toUpperCase()`).
- **Firmas existentes que se reutilizan:** `researchRepo.insertLeads(records) → .select()` (devuelve filas), `researchRepo.updateLead(id, data)` (NO devuelve filas → el estado se patchea local con el payload), `leadColumnFor`, `coerceLeadValue`, `LEAD_FIELD_DEFS` de `fields.ts`.
- **Commits:** cada tarea cierra con commit y trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Parsing de texto delimitado (`delimited.ts`)

**Files:**
- Create: `features/research/delimited.ts`
- Test: `features/research/delimited.test.ts`

**Interfaces:**
- Consumes: nada (módulo puro, sin imports del proyecto).
- Produces:
  - `detectSeparator(headerLine: string): string` — devuelve uno de `, ; \t :`; default `,`.
  - `parseDelimited(text: string, sep: string): { headers: string[]; rows: string[][] }`.

- [ ] **Step 1: Write the failing test**

`features/research/delimited.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { detectSeparator, parseDelimited } from './delimited'

describe('detectSeparator', () => {
  it('detecta el separador más frecuente en la cabecera', () => {
    expect(detectSeparator('date_added,conditions,nct')).toBe(',')
    expect(detectSeparator('date_added;conditions;nct')).toBe(';')
    expect(detectSeparator('date_added\tconditions\tnct')).toBe('\t')
    expect(detectSeparator('date_added:conditions:nct')).toBe(':')
  })
  it('default a coma sin señal clara', () => {
    expect(detectSeparator('unacolumna')).toBe(',')
  })
  it('ignora separadores dentro de comillas', () => {
    expect(detectSeparator('"a;b;c",d')).toBe(',')
  })
})

describe('parseDelimited', () => {
  it('separa headers y filas', () => {
    const { headers, rows } = parseDelimited('a,b\n1,2\n3,4', ',')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([['1', '2'], ['3', '4']])
  })
  it('respeta comas y comillas escapadas dentro de un campo', () => {
    const { rows } = parseDelimited('a,b\n"Hola, mundo","dijo ""hey"""', ',')
    expect(rows[0]).toEqual(['Hola, mundo', 'dijo "hey"'])
  })
  it('normaliza CRLF y descarta líneas vacías', () => {
    const { headers, rows } = parseDelimited('a,b\r\n1,2\r\n\r\n', ',')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([['1', '2']])
  })
  it('parsea con tab como separador', () => {
    expect(parseDelimited('a\tb\n1\t2', '\t').rows).toEqual([['1', '2']])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run features/research/delimited.test.ts`
Expected: FAIL — "Failed to resolve import './delimited'" / detectSeparator is not a function.

- [ ] **Step 3: Write minimal implementation**

`features/research/delimited.ts`:

```ts
// Parsing de texto delimitado (CSV/TSV/;/:) sin React. Puro y testeable.
// Reemplaza el parseCsvRow que vivía inline en ImportModal, generalizado a cualquier separador.

const SEPARATORS = [',', ';', '\t', ':'] as const

// Adivina el separador contando ocurrencias fuera de comillas en la cabecera. Default coma.
export function detectSeparator(headerLine: string): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, ':': 0 }
  let inQ = false
  for (const c of headerLine) {
    if (c === '"') { inQ = !inQ; continue }
    if (!inQ && c in counts) counts[c]++
  }
  let best = ',', bestN = 0
  for (const s of SEPARATORS) if (counts[s] > bestN) { best = s; bestN = counts[s] }
  return best
}

// Parser de una fila tolerante a comillas y "" escapadas dentro de campos.
function parseRow(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false }
      else cur += c
    } else if (c === '"') inQ = true
    else if (c === sep) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

export function parseDelimited(text: string, sep: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  return { headers: parseRow(lines[0], sep), rows: lines.slice(1).map(l => parseRow(l, sep)) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run features/research/delimited.test.ts`
Expected: PASS (4 + 3 tests).

- [ ] **Step 5: Commit**

```bash
git add features/research/delimited.ts features/research/delimited.test.ts
git commit -m "$(cat <<'EOF'
feat(research): parser de texto delimitado (delimited.ts) con detección de separador

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Planificación de importación (`importPlan.ts`)

**Files:**
- Create: `features/research/importPlan.ts`
- Test: `features/research/importPlan.test.ts`

**Interfaces:**
- Consumes: `leadColumnFor`, `coerceLeadValue` de `./fields`.
- Produces:
  - `type DupMode = 'update' | 'skip' | 'duplicate'`
  - `interface ImportPlan { toInsert: Record<string, any>[]; toUpdate: { id: string; values: Record<string, any> }[]; skipped: number }`
  - `guessMapping(headers: string[]): (string | null)[]`
  - `indexByNct(leads: { id: string; nct_number?: any }[]): Map<string, string>`
  - `buildImportPlan(input: { rows: string[][]; mapping: (string | null)[]; existingByNct: Map<string, string>; dupMode: DupMode }): ImportPlan`

- [ ] **Step 1: Write the failing test**

`features/research/importPlan.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { guessMapping, indexByNct, buildImportPlan } from './importPlan'

describe('guessMapping', () => {
  it('resuelve columnas reales, aliases legacy y marca desconocidas como null', () => {
    expect(guessMapping(['nct_number', 'NCT#', 'nct', 'basura']))
      .toEqual(['nct_number', 'nct_number', 'nct_number', null])
    expect(guessMapping(['status', 'email'])).toEqual(['recruitment_status', 'contact_email'])
  })
})

describe('indexByNct', () => {
  it('indexa por NCT# normalizado (upper/trim) e ignora vacíos', () => {
    const m = indexByNct([
      { id: 'a', nct_number: 'nct04267848' },
      { id: 'b', nct_number: '  NCT01 ' },
      { id: 'c', nct_number: '' },
    ])
    expect(m.get('NCT04267848')).toBe('a')
    expect(m.get('NCT01')).toBe('b')
    expect(m.size).toBe(2)
  })
})

describe('buildImportPlan', () => {
  const existing = indexByNct([{ id: 'x1', nct_number: 'NCT01' }])
  const mapping = ['nct_number', 'official_title'] as (string | null)[]
  const rows = [['NCT01', 'Estudio existente'], ['NCT99', 'Estudio nuevo'], ['', 'Sin NCT']]

  it('modo update: matchea por NCT# → toUpdate; el resto → toInsert', () => {
    const p = buildImportPlan({ rows, mapping, existingByNct: existing, dupMode: 'update' })
    expect(p.toUpdate).toEqual([{ id: 'x1', values: { nct_number: 'NCT01', official_title: 'Estudio existente' } }])
    expect(p.toInsert.map(r => r.nct_number)).toEqual(['NCT99', null])
    expect(p.skipped).toBe(0)
  })

  it('modo skip: la fila que matchea se cuenta como saltada y no se inserta', () => {
    const p = buildImportPlan({ rows, mapping, existingByNct: existing, dupMode: 'skip' })
    expect(p.skipped).toBe(1)
    expect(p.toUpdate).toEqual([])
    expect(p.toInsert.map(r => r.nct_number)).toEqual(['NCT99', null])
  })

  it('modo duplicate: ignora el match → todo a toInsert', () => {
    const p = buildImportPlan({ rows, mapping, existingByNct: existing, dupMode: 'duplicate' })
    expect(p.toUpdate).toEqual([])
    expect(p.skipped).toBe(0)
    expect(p.toInsert).toHaveLength(3)
  })

  it('descarta filas totalmente vacías', () => {
    const p = buildImportPlan({ rows: [['', '']], mapping, existingByNct: existing, dupMode: 'update' })
    expect(p.toInsert).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run features/research/importPlan.test.ts`
Expected: FAIL — "Failed to resolve import './importPlan'".

- [ ] **Step 3: Write minimal implementation**

`features/research/importPlan.ts`:

```ts
// Planificación pura de una importación de leads. Decide insert/update/skip según el modo
// de duplicados y el match por NCT# contra los leads ya existentes. Sin React, sin red.
import { leadColumnFor, coerceLeadValue } from './fields'

export type DupMode = 'update' | 'skip' | 'duplicate'

export interface ImportPlan {
  toInsert: Record<string, any>[]
  toUpdate: { id: string; values: Record<string, any> }[]
  skipped: number
}

const normHeader = (h: string) => h.trim().toLowerCase().replace(/ /g, '_').replace(/#/g, '')
const normNct = (v: any) => (v ?? '').toString().trim().toUpperCase()

// header (columna real o alias legacy) → columna real; null = ignorar.
export function guessMapping(headers: string[]): (string | null)[] {
  return headers.map(h => leadColumnFor(normHeader(h)))
}

// nct_number normalizado → id del lead existente (ignora leads sin NCT#).
export function indexByNct(leads: { id: string; nct_number?: any }[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const l of leads) { const k = normNct(l.nct_number); if (k) m.set(k, l.id) }
  return m
}

export function buildImportPlan(input: {
  rows: string[][]
  mapping: (string | null)[]
  existingByNct: Map<string, string>
  dupMode: DupMode
}): ImportPlan {
  const { rows, mapping, existingByNct, dupMode } = input
  const plan: ImportPlan = { toInsert: [], toUpdate: [], skipped: 0 }
  for (const row of rows) {
    const values: Record<string, any> = {}
    mapping.forEach((col, i) => { if (col) values[col] = coerceLeadValue(col, (row[i] ?? '').trim()) })
    // Descartar filas sin ningún valor (todas las celdas mapeadas vacías → null).
    if (!Object.values(values).some(v => v !== null)) continue
    const id = existingByNct.get(normNct(values.nct_number))
    if (dupMode === 'duplicate' || !id) { plan.toInsert.push(values); continue }
    if (dupMode === 'skip') { plan.skipped++; continue }
    plan.toUpdate.push({ id, values }) // 'update'
  }
  return plan
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run features/research/importPlan.test.ts`
Expected: PASS (todos los describe).

- [ ] **Step 5: Commit**

```bash
git add features/research/importPlan.ts features/research/importPlan.test.ts
git commit -m "$(cat <<'EOF'
feat(research): planificación pura de importación (insert/update/skip por NCT#)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Claves i18n `research.import.*`

**Files:**
- Modify: `shared/i18n/locales/es.json` (agregar bloque tras `research.nct.filled`)
- Modify: `shared/i18n/locales/en.json` (mismas claves, mismo lugar)

**Interfaces:**
- Produces: 21 claves `research.import.*` disponibles como `I18nKey` para Task 4. El resumen usa interpolación `{ins}`/`{upd}`/`{skip}` y las filas `{n}` (soportado por `t(key, vars)` en `shared/i18n/index.tsx`).

- [ ] **Step 1: Agregar las claves a `es.json`**

Insertar dentro del objeto raíz de `shared/i18n/locales/es.json`, justo después de la línea `"research.nct.filled": "...",`:

```json
  "research.import.title": "Importar CSV/TSV",
  "research.import.selectFile": "Elegí un archivo CSV o TSV",
  "research.import.empty": "Archivo vacío",
  "research.import.noColumns": "No hay columnas mapeadas",
  "research.import.button": "Importar",
  "research.import.fileSection": "Archivo",
  "research.import.separator": "Separador",
  "research.import.sep.comma": "Coma",
  "research.import.sep.semicolon": "Punto y coma",
  "research.import.sep.tab": "Tabulación",
  "research.import.sep.colon": "Dos puntos",
  "research.import.rowsDetected": "{n} filas detectadas",
  "research.import.dupSection": "Duplicados",
  "research.import.dupLabel": "Si el NCT# ya existe",
  "research.import.dup.update": "Actualizar",
  "research.import.dup.skip": "Saltar",
  "research.import.dup.duplicate": "Duplicar",
  "research.import.mapSection": "Mapeo de columnas",
  "research.import.ignore": "— Ignorar —",
  "research.import.summary": "{ins} nuevos · {upd} a actualizar · {skip} saltados",
  "research.import.done": "{ins} importados, {upd} actualizados, {skip} saltados",
```

- [ ] **Step 2: Agregar las mismas claves a `en.json`**

Insertar en el mismo lugar de `shared/i18n/locales/en.json` (después de `"research.nct.filled": "...",`):

```json
  "research.import.title": "Import CSV/TSV",
  "research.import.selectFile": "Choose a CSV or TSV file",
  "research.import.empty": "Empty file",
  "research.import.noColumns": "No columns mapped",
  "research.import.button": "Import",
  "research.import.fileSection": "File",
  "research.import.separator": "Separator",
  "research.import.sep.comma": "Comma",
  "research.import.sep.semicolon": "Semicolon",
  "research.import.sep.tab": "Tab",
  "research.import.sep.colon": "Colon",
  "research.import.rowsDetected": "{n} rows detected",
  "research.import.dupSection": "Duplicates",
  "research.import.dupLabel": "If the NCT# already exists",
  "research.import.dup.update": "Update",
  "research.import.dup.skip": "Skip",
  "research.import.dup.duplicate": "Duplicate",
  "research.import.mapSection": "Column mapping",
  "research.import.ignore": "— Ignore —",
  "research.import.summary": "{ins} new · {upd} to update · {skip} skipped",
  "research.import.done": "{ins} imported, {upd} updated, {skip} skipped",
```

- [ ] **Step 3: Verificar paridad de claves y que tipa**

Run:
```bash
node -e "const a=require('./shared/i18n/locales/es.json'),b=require('./shared/i18n/locales/en.json');const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();console.log(JSON.stringify(ka)===JSON.stringify(kb)?'OK '+ka.length+' claves':'MISMATCH')"
pnpm tsc --noEmit 2>&1 | grep -c error
```
Expected: `OK 418 claves` (397 previas + 21) y `0` errores de tsc.

- [ ] **Step 4: Commit**

```bash
git add shared/i18n/locales/es.json shared/i18n/locales/en.json
git commit -m "$(cat <<'EOF'
feat(i18n): claves research.import.* (es/en) para la ventana de importación

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Rework del `ImportModal` + `confirmImport`

Cambian juntos: `confirmImport` cambia de firma (recibe un `ImportPlan` en vez de un array crudo) y su único llamador es `ImportModal`. Se hacen en el mismo commit para no dejar el build roto.

**Files:**
- Modify: `features/research/hooks/useResearchData.ts:97-103` (función `confirmImport`)
- Rewrite: `features/research/components/leads/ImportModal.tsx`

**Interfaces:**
- Consumes: `parseDelimited`, `detectSeparator` (Task 1); `guessMapping`, `indexByNct`, `buildImportPlan`, `DupMode`, `ImportPlan` (Task 2); claves `research.import.*` (Task 3); `researchRepo.insertLeads`/`updateLead`, `LEAD_FIELD_DEFS`, `RESEARCH_THEME`, `inputStyle`, `useResearch().leads`.
- Produces: `confirmImport(plan: ImportPlan): Promise<boolean>`.

- [ ] **Step 1: Reemplazar `confirmImport` en `useResearchData.ts`**

En `features/research/hooks/useResearchData.ts`, agregar el import del tipo en la línea 6 y reemplazar la función `confirmImport` (líneas 97-103).

Cambiar la línea 6 de:
```ts
import { EXPORT_HEADERS, validateLead, buildLeadPayload } from '../fields'
```
a:
```ts
import { EXPORT_HEADERS, validateLead, buildLeadPayload } from '../fields'
import type { ImportPlan } from '../importPlan'
```

Reemplazar la función `confirmImport` completa por:
```ts
  async function confirmImport(plan: ImportPlan) {
    let inserted: Lead[] = []
    if (plan.toInsert.length) {
      const { data, error } = await researchRepo.insertLeads(plan.toInsert)
      if (error) { mostrarMensaje('error', 'Error: ' + error.message); return false }
      inserted = data || []
    }
    for (const u of plan.toUpdate) {
      const { error } = await researchRepo.updateLead(u.id, u.values)
      if (error) { mostrarMensaje('error', 'Error: ' + error.message); return false }
    }
    // updateLead no devuelve filas → patcheamos el estado con el payload aplicado.
    const patch = new Map(plan.toUpdate.map(u => [u.id, u.values]))
    setLeads(prev => [...inserted, ...prev.map(l => (patch.has(l.id) ? { ...l, ...patch.get(l.id) } : l))])
    mostrarMensaje('ok', t('research.import.done', { ins: inserted.length, upd: plan.toUpdate.length, skip: plan.skipped }))
    return true
  }
```

- [ ] **Step 2: Reescribir `ImportModal.tsx`**

Reemplazar TODO el contenido de `features/research/components/leads/ImportModal.tsx` por:

```tsx
'use client'
import { useMemo, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { RESEARCH_THEME, inputStyle } from '../../theme'
import { LEAD_FIELD_DEFS } from '../../fields'
import { detectSeparator, parseDelimited } from '../../delimited'
import { guessMapping, indexByNct, buildImportPlan, type DupMode } from '../../importPlan'
import { useResearch } from '../ResearchContext'

const SEP_OPTIONS = [
  { value: ',', labelKey: 'research.import.sep.comma' },
  { value: ';', labelKey: 'research.import.sep.semicolon' },
  { value: '\t', labelKey: 'research.import.sep.tab' },
  { value: ':', labelKey: 'research.import.sep.colon' },
] as const

export default function ImportModal() {
  const { s1, s2, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { mostrarMensaje } = useApp()
  const { t } = useT()
  const { modalImport, setModalImport, confirmImport, leads } = useResearch()
  const [raw, setRaw] = useState<string | null>(null)
  const [sep, setSep] = useState(',')
  const [mapping, setMapping] = useState<(string | null)[]>([])
  const [dupMode, setDupMode] = useState<DupMode>('update')
  if (!modalImport) return null

  const close = () => { setModalImport(false); setRaw(null); setMapping([]); setSep(','); setDupMode('update') }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const firstLine = text.replace(/\r\n?/g, '\n').split('\n').find(l => l.trim())
    if (!firstLine) { mostrarMensaje('error', t('research.import.empty')); return }
    const detected = detectSeparator(firstLine)
    setRaw(text); setSep(detected); setMapping(guessMapping(parseDelimited(text, detected).headers))
  }

  // Cambiar el separador re-parsea y re-adivina el mapeo (las columnas cambian).
  function changeSep(newSep: string) {
    setSep(newSep)
    if (raw) setMapping(guessMapping(parseDelimited(raw, newSep).headers))
  }

  const parsed = useMemo(() => (raw ? parseDelimited(raw, sep) : { headers: [], rows: [] }), [raw, sep])
  const existingByNct = useMemo(() => indexByNct(leads), [leads])
  const plan = useMemo(
    () => buildImportPlan({ rows: parsed.rows, mapping, existingByNct, dupMode }),
    [parsed.rows, mapping, existingByNct, dupMode],
  )
  const canImport = parsed.rows.length > 0 && mapping.some(Boolean)

  async function doImport() {
    if (!canImport) { mostrarMensaje('error', t('research.import.noColumns')); return }
    if (await confirmImport(plan)) close()
  }

  const sectionTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: accent, margin: '18px 0 10px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 680, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{t('research.import.title')}</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {raw && (
              <button onClick={doImport} disabled={!canImport} style={{ padding: '8px 18px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: canImport ? 'pointer' : 'default', opacity: canImport ? 1 : 0.5 }}>{t('research.import.button')}</button>
            )}
            <button onClick={close} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {!raw ? (
          <div style={{ border: `2px dashed ${border}`, borderRadius: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 12, color: t3, marginBottom: 12 }}>{t('research.import.selectFile')}</div>
            <input type="file" accept=".csv,.tsv,.txt" onChange={onFile} style={{ fontSize: 12 }} />
          </div>
        ) : (
          <>
            {/* ARCHIVO */}
            <div style={sectionTitle}>{t('research.import.fileSection')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: t3, minWidth: 90 }}>{t('research.import.separator')}</span>
              <select value={sep} onChange={e => changeSep(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }}>
                {SEP_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
              </select>
              <span style={{ fontSize: 11, color: t3 }}>{t('research.import.rowsDetected', { n: parsed.rows.length })}</span>
            </div>
            <div style={{ maxHeight: 180, overflow: 'auto', border: `1px solid ${border}`, borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead><tr style={{ background: s2 }}>
                  {parsed.headers.slice(0, 6).map((h, i) => <th key={i} style={{ padding: '6px 8px', textAlign: 'left', color: t3, borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr></thead>
                <tbody>{parsed.rows.slice(0, 5).map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                    {r.slice(0, 6).map((v, j) => <td key={j} style={{ padding: '5px 8px', color: t2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>

            {/* DUPLICADOS */}
            <div style={sectionTitle}>{t('research.import.dupSection')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: t3, minWidth: 90 }}>{t('research.import.dupLabel')}</span>
              <select value={dupMode} onChange={e => setDupMode(e.target.value as DupMode)} style={{ ...inputStyle, maxWidth: 220 }}>
                <option value="update">{t('research.import.dup.update')}</option>
                <option value="skip">{t('research.import.dup.skip')}</option>
                <option value="duplicate">{t('research.import.dup.duplicate')}</option>
              </select>
            </div>

            {/* MAPEO */}
            <div style={sectionTitle}>{t('research.import.mapSection')}</div>
            {parsed.headers.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ flex: 1, fontSize: 12, color: t2, fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</div>
                <span style={{ color: t3 }}>→</span>
                <select value={mapping[i] ?? ''} onChange={e => { const v = e.target.value || null; setMapping(m => m.map((c, j) => (j === i ? v : c))) }} style={{ ...inputStyle, flex: 1 }}>
                  <option value="">{t('research.import.ignore')}</option>
                  {LEAD_FIELD_DEFS.map(f => <option key={f.column} value={f.column}>{t(f.labelKey)}</option>)}
                </select>
              </div>
            ))}
            <div style={{ fontSize: 12, color: accent, marginTop: 12, fontWeight: 600 }}>
              {t('research.import.summary', { ins: plan.toInsert.length, upd: plan.toUpdate.length, skip: plan.skipped })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + tests + hook i18n**

Run:
```bash
pnpm tsc --noEmit 2>&1 | grep -c error
pnpm vitest run features/research 2>&1 | tail -5
```
Expected: `0` errores de tsc; todos los tests de `features/research` en verde (incluye Task 1 y 2).

- [ ] **Step 4: Smoke test manual en el navegador**

Levantar dev server (`pnpm dev`), entrar a `/research` → Leads → botón Import. Verificar:
1. Elegir un CSV exportado por la app → separador detectado = Coma, preview con datos, mapeo auto-completo.
2. El resumen muestra "N nuevos · 0 a actualizar · 0 saltados".
3. Reimportar el mismo archivo con modo **Actualizar** → resumen muestra los existentes en "a actualizar"; al importar, no se duplican (mismo total de leads en la tabla).
4. Cambiar una columna del mapeo a "— Ignorar —" y verificar que el resumen no cambia el conteo de filas pero esa columna deja de mandarse.
5. Modo **Saltar** con archivo repetido → "K saltados", 0 nuevos.

- [ ] **Step 5: Commit**

```bash
git add features/research/hooks/useResearchData.ts features/research/components/leads/ImportModal.tsx
git commit -m "$(cat <<'EOF'
feat(research): ventana de importación estilo Anki (separador, mapeo, duplicados)

confirmImport ahora recibe un ImportPlan (insert + update por NCT# + skipped).
ImportModal: separador auto-detectado y elegible, preview, field mapping manual
por columna con opción Ignorar, manejo de duplicados (actualizar/saltar/duplicar)
y resumen vivo. Todo i18n.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Separador elegible + auto-detect → Task 1 (`detectSeparator`) + Task 4 (select). ✓
- Field mapping manual con Ignorar → Task 2 (`guessMapping`) + Task 4 (selects). ✓
- Duplicados por NCT# (update/skip/duplicate) → Task 2 (`buildImportPlan`) + Task 4 (select) + Task 4 Step 1 (`confirmImport`). ✓
- Panel único con scroll, Import arriba → Task 4. ✓
- Match client-side sin migración → Task 2 (`indexByNct`) usa `leads` en memoria. ✓
- CSV/TSV solo, sin deps → Task 1, `accept=".csv,.tsv,.txt"`. ✓
- i18n es/en a la par → Task 3. ✓
- Errores (vacío, sin columnas) → Task 4 (`onFile` empty, `canImport` disabled + `noColumns`). ✓
- Tests parsing + plan → Task 1, Task 2. ✓

**Type consistency:** `ImportPlan`/`DupMode` definidos en Task 2 y consumidos idénticos en Task 4 (`confirmImport(plan: ImportPlan)`, `useState<(string|null)[]>`, `dupMode as DupMode`). `guessMapping`/`indexByNct`/`buildImportPlan` firmas iguales entre definición (Task 2) y uso (Task 4). `updateLead` sin `.select()` → estado patcheado con payload (no se asume retorno de filas). ✓

**Placeholder scan:** sin TBD/TODO; todo el código está completo. ✓

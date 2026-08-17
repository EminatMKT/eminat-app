// Planificación pura de una importación de leads. Decide insert/update/skip según el modo
// de duplicados y el match por NCT# contra los leads ya existentes. Sin React, sin red.
import { leadColumnFor, coerceLeadValue, normalizeDomainValue } from './fields'
import { normNct, DEFAULT_STAGE, COUNT_COLUMN } from '../constants'

// NCT# es único (research_leads_nct_number_key): no existe "duplicar" un NCT ya presente.
// Filas sin NCT# (o con NCT nuevo) siempre insertan; con NCT existente: update o skip.
export type DupMode = 'update' | 'skip'

// Override manual de valores de dominio por columna: { columna: { valorCrudo: canónico } }.
export type ValueMap = Record<string, Record<string, string>>

// Valor final de una celda: override del usuario ?? auto-normalización al dominio. Un valor
// de dominio no reconocido (null) cae a '' (→ null) para no romper el insert ni el CHECK.
function resolveValue(col: string, raw: string, valueMap?: ValueMap): any {
  const override = valueMap?.[col]?.[raw]
  if (override !== undefined) return override
  const norm = normalizeDomainValue(col, raw)
  return norm === null ? '' : norm
}

export interface ImportPlan {
  toInsert: Record<string, any>[]
  toUpdate: { id: string; values: Record<string, any> }[]
  skipped: number
}

const normHeader = (h: string) => h.trim().toLowerCase().replace(/ /g, '_').replace(/#/g, '')

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
  valueMap?: ValueMap
}): ImportPlan {
  const { rows, mapping, existingByNct, dupMode, valueMap } = input
  const plan: ImportPlan = { toInsert: [], toUpdate: [], skipped: 0 }
  for (const row of rows) {
    const values: Record<string, any> = {}
    mapping.forEach((col, i) => { if (col) values[col] = coerceLeadValue(col, resolveValue(col, (row[i] ?? '').trim(), valueMap)) })
    // Descartar filas sin ningún valor (todas las celdas mapeadas vacías → null).
    if (!Object.values(values).some(v => v !== null)) continue
    const id = existingByNct.get(normNct(values.nct_number))
    if (!id) {
      // Insert: si el CSV no trae stage (columna ausente o celda vacía), arranca en la etapa default.
      if (values.stage == null) values.stage = DEFAULT_STAGE
      plan.toInsert.push(values)
      continue
    }
    if (dupMode === 'skip') { plan.skipped++; continue }
    // El contador solo se pisa si el CSV trae un valor. Celda vacía = "no lo informé", NO
    // "ponelo en cero": sin esto, exportar y reimportar sin llenar la columna borraría los
    // conteos que Royner cargó por el pop-up. Mismo criterio que `stage` en un update.
    if (values[COUNT_COLUMN] == null) delete values[COUNT_COLUMN]
    plan.toUpdate.push({ id, values }) // 'update'
  }
  return plan
}

// Un cambio de contador que el import haría sobre un lead ya existente. Alimenta el preview:
// el import PISA (nunca suma, para que reimportar el mismo archivo sea idempotente), pero
// avisa antes y deja desmarcar lead por lead — el contador tiene dos escritores.
export interface CounterChange {
  id: string
  nct: string
  from: number | null
  to: number
}

// Los updates del plan que efectivamente cambian el contador, contra los valores actuales.
export function planCounterChanges(plan: ImportPlan, currentById: Map<string, number | null>): CounterChange[] {
  const changes: CounterChange[] = []
  for (const u of plan.toUpdate) {
    const to = u.values[COUNT_COLUMN]
    if (to == null) continue
    const from = currentById.get(u.id) ?? null
    if (from === to) continue
    changes.push({ id: u.id, nct: normNct(u.values.nct_number), from, to })
  }
  return changes
}

// Devuelve el plan sin el contador para los leads desmarcados en el preview. El resto de las
// columnas de esos leads se importa igual — se descarta el contador, no la fila.
export function stripCounterFor(plan: ImportPlan, ids: Set<string>): ImportPlan {
  return {
    ...plan,
    toUpdate: plan.toUpdate.map(u => {
      if (!ids.has(u.id)) return u
      const values = { ...u.values }
      delete values[COUNT_COLUMN]
      return { id: u.id, values }
    }),
  }
}

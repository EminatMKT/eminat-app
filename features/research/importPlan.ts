// Planificación pura de una importación de leads. Decide insert/update/skip según el modo
// de duplicados y el match por NCT# contra los leads ya existentes. Sin React, sin red.
import { leadColumnFor, coerceLeadValue, normalizeDomainValue } from './fields'
import { normNct } from './constants'

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
    if (!id) { plan.toInsert.push(values); continue } // sin match (o sin NCT#) → insertar
    if (dupMode === 'skip') { plan.skipped++; continue }
    plan.toUpdate.push({ id, values }) // 'update'
  }
  return plan
}

// Planificación pura de una importación de leads. Decide insert/update/skip según el modo
// de duplicados y el match por NCT# contra los leads ya existentes. Sin React, sin red.
//
// El algoritmo genérico (mapear+coercer cada celda, matchear por clave, colapsar filas
// repetidas) vive en `@/shared/import`, compartido con Medical. Lo que sigue siendo de
// Research es la IDENTIDAD —reconocer un lead por su NCT#— y dos reglas de negocio que un
// plan genérico no puede saber: el default de `stage` en un insert, y que `email_count`
// vacío en un update no pisa el valor existente.
import { buildImportPlan as buildPlanCompartido } from '@/shared/import'
import type { Identity, ImportPlan } from '@/shared/import'
import { leadColumnFor, coerceLeadValue, normalizeDomainValue } from './fields'
import { normNct, DEFAULT_STAGE, COUNT_COLUMN } from '../constants'

export type { ImportPlan }

// NCT# es único (research_leads_nct_number_key): no existe "duplicar" un NCT ya presente.
// Filas sin NCT# (o con NCT nuevo) siempre insertan; con NCT existente: update o skip.
export type DupMode = 'update' | 'skip'

// Override manual de valores de dominio por columna: { columna: { valorCrudo: canónico } }.
export type ValueMap = Record<string, Record<string, string>>

// Valor final de una celda: override del usuario ?? auto-normalización al dominio. Un valor
// de dominio no reconocido (null) cae a '' (→ null) para no romper el insert ni el CHECK.
function resolveValue(col: string, raw: string, valueMap?: ValueMap): string {
  const override = valueMap?.[col]?.[raw]
  if (override !== undefined) return override
  const norm = normalizeDomainValue(col, raw)
  return norm === null ? '' : norm
}

const normHeader = (h: string) => h.trim().toLowerCase().replace(/ /g, '_').replace(/#/g, '')

// header (columna real o alias legacy) → columna real; null = ignorar.
export function guessMapping(headers: string[]): (string | null)[] {
  return headers.map(h => leadColumnFor(normHeader(h)))
}

// Headers del archivo que NO se van a importar porque no mapean a ninguna columna.
//
// El import los descarta sin decir nada y el resumen cuenta FILAS, no columnas: se lee
// "3 a actualizar" sin enterarse de que media tabla se tiró. El caso que lo destapó fue el
// header `Etapa` de la tabla de Federico — los contadores entraban, las etapas no, y los
// leads quedaban con la etapa vieja en silencio.
//
// Agregar alias tapa casos de a uno; esto expone el hueco entero. Los headers en blanco no
// cuentan: una coma de más al final del CSV no es una columna que el usuario haya perdido.
export function ignoredHeaders(headers: string[], mapping: (string | null)[]): string[] {
  const out: string[] = []
  headers.forEach((h, i) => {
    const name = (h ?? '').trim()
    if (!name || mapping[i] || out.includes(name)) return
    out.push(name)
  })
  return out
}

// nct_number normalizado → id del lead existente (ignora leads sin NCT#).
export function indexByNct(leads: { id: string; nct_number?: string | null }[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const l of leads) { const k = normNct(l.nct_number); if (k) m.set(k, l.id) }
  return m
}

// Identidad de Research: la clave es el NCT# normalizado. Sin NCT#, cada fila es su propia
// clave (por índice de fila) para que nunca colapse con otra fila sin NCT# — Research nunca
// fusiona por nombre, así que sin esto todas las filas sin NCT# se pisarían entre sí.
function identityPorNct(mapping: (string | null)[], existingByNct: Map<string, string>): Identity {
  const nctIdx = mapping.indexOf('nct_number')
  return {
    claveOrigen: (fila, i) => {
      const norm = nctIdx >= 0 ? normNct(fila[nctIdx]) : ''
      return norm || `__sin_nct__${i}`
    },
    existente: (clave) => existingByNct.get(clave),
    candidatos: () => [], // Research no fusiona por similitud: solo matchea por NCT#.
  }
}

export function buildImportPlan(input: {
  rows: string[][]
  mapping: (string | null)[]
  existingByNct: Map<string, string>
  dupMode: DupMode
  valueMap?: ValueMap
}): ImportPlan {
  const { rows, mapping, existingByNct, dupMode, valueMap } = input
  const coerce = (col: string, v: string) => coerceLeadValue(col, resolveValue(col, v, valueMap))
  const plan = buildPlanCompartido({ rows, mapping, identity: identityPorNct(mapping, existingByNct), coerce })

  // Insert: si el CSV no trae stage (columna ausente o celda vacía), arranca en la etapa default.
  const toInsert = plan.toInsert.map(values => (values.stage == null ? { ...values, stage: DEFAULT_STAGE } : values))

  if (dupMode === 'skip') {
    return { ...plan, toInsert, toUpdate: [], skipped: plan.skipped + plan.toUpdate.length }
  }

  // El contador solo se pisa si el CSV trae un valor. Celda vacía = "no lo informé", NO
  // "ponelo en cero": sin esto, exportar y reimportar sin llenar la columna borraría los
  // conteos que Royner cargó por el pop-up.
  const toUpdate = plan.toUpdate.map(u => {
    if (u.values[COUNT_COLUMN] != null) return u
    const values = { ...u.values }
    delete values[COUNT_COLUMN]
    return { id: u.id, values }
  })

  return { ...plan, toInsert, toUpdate }
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
    if (typeof to !== 'number') continue
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

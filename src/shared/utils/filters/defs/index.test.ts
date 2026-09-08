import { describe, it, expect } from 'vitest'
import { applyFilters, countByOption, distinctValues, distinctTokens, visibleDefs } from './index'
import type { FilterDef } from '../types'

type Row = { phase: string; country: string }
const rows: Row[] = [
  { phase: 'Phase 2', country: 'Spain, France' },
  { phase: 'Phase 1/Phase 2', country: 'USA' },
  { phase: 'Phase 3', country: 'France' },
]
const DEFS: FilterDef<Row>[] = [
  { key: 'phase', labelKey: 'common.all', nameKey: 'common.all', options: r => distinctValues(r, x => x.phase), match: (x, v) => x.phase.includes(v) },
  { key: 'country', labelKey: 'common.all', nameKey: 'common.all', options: r => distinctTokens(r, x => x.country), match: (x, v) => x.country.includes(v) },
]

describe('applyFilters', () => {
  it('sin valores devuelve todo', () => {
    expect(applyFilters(rows, DEFS, {})).toHaveLength(3)
  })
  it('phase por inclusión captura multivalor', () => {
    // "Phase 2" matchea "Phase 2" y "Phase 1/Phase 2"
    expect(applyFilters(rows, DEFS, { phase: 'Phase 2' }).map(r => r.phase)).toEqual(['Phase 2', 'Phase 1/Phase 2'])
  })
  it('combina filtros en AND', () => {
    expect(applyFilters(rows, DEFS, { phase: 'Phase 2', country: 'France' })).toEqual([{ phase: 'Phase 2', country: 'Spain, France' }])
  })
})

describe('distinctValues / distinctTokens', () => {
  it('distinctValues: únicos ordenados de una columna', () => {
    expect(distinctValues(rows, r => r.phase)).toEqual(['Phase 1/Phase 2', 'Phase 2', 'Phase 3'])
  })
  it('distinctTokens: separa columnas multivalor por coma', () => {
    expect(distinctTokens(rows, r => r.country)).toEqual(['France', 'Spain', 'USA'])
  })
})

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

describe('countByOption', () => {
  const filas = [{ area: 'mkt' }, { area: 'med' }, { area: 'mkt' }]
  const def: FilterDef<{ area: string }> = {
    key: 'area', labelKey: 'common.all', nameKey: 'common.all', kind: 'chips',
    options: items => distinctValues(items, r => r.area),
    match: (r, v) => r.area === v,
  }

  it('cuenta cuántos items caen en cada opción', () => {
    expect(countByOption(filas, def)).toEqual({ mkt: 2, med: 1 })
  })

  // Una opción del dominio que hoy no tiene filas se muestra en cero, no se esconde: el chip
  // sirve para preguntar «¿no hay ninguna de Medical?» y una opción que desaparece no deja.
  it('una opción sin items cuenta cero, no desaparece', () => {
    const conDominio = { ...def, options: () => ['mkt', 'med', 'ops'] }
    expect(countByOption(filas, conDominio)).toEqual({ mkt: 2, med: 1, ops: 0 })
  })
})

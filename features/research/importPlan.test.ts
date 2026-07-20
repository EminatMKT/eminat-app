import { describe, it, expect } from 'vitest'
import { guessMapping, indexByNct, buildImportPlan } from './importPlan'
import { DEFAULT_STAGE, STAGE } from './constants'

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

  it('descarta filas totalmente vacías', () => {
    const p = buildImportPlan({ rows: [['', '']], mapping, existingByNct: existing, dupMode: 'update' })
    expect(p.toInsert).toHaveLength(0)
  })

  it('auto-normaliza valores de dominio (phase 2 → Phase 2); no resuelto → null', () => {
    const m = ['nct_number', 'phase'] as (string | null)[]
    const p = buildImportPlan({ rows: [['NCTa', '2'], ['NCTb', '9']], mapping: m, existingByNct: new Map(), dupMode: 'update' })
    expect(p.toInsert[0].phase).toBe('Phase 2')
    expect(p.toInsert[1].phase).toBeNull() // '9' no mapea a ningún Phase → '' → null
  })

  it('el override del usuario (valueMap) gana sobre la auto-normalización', () => {
    const m = ['nct_number', 'phase'] as (string | null)[]
    const p = buildImportPlan({ rows: [['NCTa', '9']], mapping: m, existingByNct: new Map(), dupMode: 'update', valueMap: { phase: { '9': 'Phase 4' } } })
    expect(p.toInsert[0].phase).toBe('Phase 4')
  })
})

describe('default de stage en import', () => {
  const mapping = ['nct_number', 'official_title', 'stage']
  it('un insert sin stage arranca en la etapa default', () => {
    const plan = buildImportPlan({
      rows: [['NCT00000001', 'Estudio A', '']],
      mapping, existingByNct: new Map(), dupMode: 'update',
    })
    expect(plan.toInsert).toHaveLength(1)
    expect(plan.toInsert[0].stage).toBe(DEFAULT_STAGE)
  })
  it('un insert con stage explícito lo respeta', () => {
    const plan = buildImportPlan({
      rows: [['NCT00000002', 'Estudio B', STAGE.GANADO]],
      mapping, existingByNct: new Map(), dupMode: 'update',
    })
    expect(plan.toInsert[0].stage).toBe(STAGE.GANADO)
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

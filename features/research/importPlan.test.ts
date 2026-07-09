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

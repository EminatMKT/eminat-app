import { describe, it, expect } from 'vitest'
import { guessMapping, indexByNct, buildImportPlan, planCounterChanges, stripCounterFor, ignoredHeaders } from './importPlan'
import { DEFAULT_STAGE, STAGE } from '../constants'

describe('guessMapping', () => {
  it('resuelve columnas reales, aliases legacy y marca desconocidas como null', () => {
    expect(guessMapping(['nct_number', 'NCT#', 'nct', 'basura']))
      .toEqual(['nct_number', 'nct_number', 'nct_number', null])
    expect(guessMapping(['status', 'email'])).toEqual(['recruitment_status', 'contact_email'])
  })
})

describe('guessMapping de email_count', () => {
  // El correo de Federico (12/08/2026) trae la columna como "Email Count (Royner)". Sin alias,
  // normHeader la vuelve 'email_count_(royner)', no matchea, y el import la ignora EN SILENCIO
  // — justo la columna que motiva la feature.
  it('mapea "Email Count" y la variante con el nombre de Royner a email_count', () => {
    expect(guessMapping(['Email Count', 'Email Count (Royner)'])).toEqual(['email_count', 'email_count'])
  })

  // Misma tabla, mismo correo, misma clase de bug: la columna se llama "Etapa" y sin alias
  // el import la descartaba sin decir nada, dejando los leads en la etapa que ya tenían.
  it('mapea el header en español "Etapa" a stage', () => {
    expect(guessMapping(['Etapa'])).toEqual(['stage'])
  })
})

// El import descarta en silencio toda columna que no mapea, y el resumen cuenta FILAS, no
// columnas: se lee "3 a actualizar" sin saber que media tabla se tiró. Esto lista lo tirado.
describe('ignoredHeaders', () => {
  it('lista los headers que no mapean a ninguna columna', () => {
    expect(ignoredHeaders(['nct_number', 'Notas del vendedor', 'phase'], ['nct_number', null, 'phase']))
      .toEqual(['Notas del vendedor'])
  })

  it('no reporta nada cuando todas las columnas mapean', () => {
    expect(ignoredHeaders(['nct_number', 'phase'], ['nct_number', 'phase'])).toEqual([])
  })

  it('ignora los headers vacíos: una coma de más al final del CSV no es una columna perdida', () => {
    expect(ignoredHeaders(['nct_number', '', '   '], ['nct_number', null, null])).toEqual([])
  })

  it('no repite un header duplicado que aparece dos veces sin mapear', () => {
    expect(ignoredHeaders(['Comentario', 'Comentario'], [null, null])).toEqual(['Comentario'])
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

  // Sin NCT# no hay clave que matchee: la identidad de Research (`identityPorNct`) le da a
  // cada fila una clave única por índice para que dos filas sin NCT# nunca se pisen entre sí.
  // Fix del round 1 (2026-08-21): esto no tenía test propio — solo lo ejercitaba de casualidad
  // el fixture compartido de arriba, que trae una sola fila sin NCT#.
  it('dos filas sin NCT# con datos distintos entran las dos, no una', () => {
    const p = buildImportPlan({
      rows: [['', 'Estudio A'], ['', 'Estudio B']],
      mapping, existingByNct: new Map(), dupMode: 'update',
    })
    expect(p.toInsert).toHaveLength(2)
    expect(p.toInsert.map(r => r.official_title)).toEqual(['Estudio A', 'Estudio B'])
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

// El contador tiene DOS escritores (el pop-up de la app y el Excel de Royner vía import).
// Decisión 2026-08-17: el import pisa, pero avisa antes y deja desmarcar lead por lead.
describe('email_count en un update de import', () => {
  const mapping = ['nct_number', 'email_count']
  const existingByNct = new Map([['NCT01', 'id-1']])

  it('una celda vacía NO pisa el contador existente — vacío es "no lo informé", no "ponelo en cero"', () => {
    const plan = buildImportPlan({ rows: [['NCT01', '']], mapping, existingByNct, dupMode: 'update' })
    expect(plan.toUpdate).toHaveLength(1)
    expect(plan.toUpdate[0].values).not.toHaveProperty('email_count')
  })

  it('una celda con valor sí pisa', () => {
    const plan = buildImportPlan({ rows: [['NCT01', '3']], mapping, existingByNct, dupMode: 'update' })
    expect(plan.toUpdate[0].values.email_count).toBe(3)
  })

  it('pisa, no suma: importar el mismo archivo dos veces deja el mismo valor', () => {
    const rows = [['NCT01', '3']]
    const once = buildImportPlan({ rows, mapping, existingByNct, dupMode: 'update' })
    const twice = buildImportPlan({ rows, mapping, existingByNct, dupMode: 'update' })
    expect(twice.toUpdate[0].values.email_count).toBe(once.toUpdate[0].values.email_count)
  })
})

describe('planCounterChanges', () => {
  const mapping = ['nct_number', 'email_count']
  const existingByNct = new Map([['NCT01', 'id-1'], ['NCT02', 'id-2']])

  it('lista solo los leads cuyo contador cambia de valor', () => {
    const plan = buildImportPlan({ rows: [['NCT01', '3'], ['NCT02', '2']], mapping, existingByNct, dupMode: 'update' })
    const changes = planCounterChanges(plan, new Map([['id-1', 2], ['id-2', 2]]))
    expect(changes).toEqual([{ id: 'id-1', nct: 'NCT01', from: 2, to: 3 }])
  })

  it('un lead que todavía no tiene contador se reporta desde null', () => {
    const plan = buildImportPlan({ rows: [['NCT01', '3']], mapping, existingByNct, dupMode: 'update' })
    expect(planCounterChanges(plan, new Map())).toEqual([{ id: 'id-1', nct: 'NCT01', from: null, to: 3 }])
  })
})

describe('stripCounterFor', () => {
  it('saca el contador de los updates desmarcados y deja intacto el resto del lead', () => {
    const plan = buildImportPlan({
      rows: [['NCT01', '3', 'Estudio A']],
      mapping: ['nct_number', 'email_count', 'official_title'],
      existingByNct: new Map([['NCT01', 'id-1']]),
      dupMode: 'update',
    })
    const kept = stripCounterFor(plan, new Set(['id-1']))
    expect(kept.toUpdate[0].values).not.toHaveProperty('email_count')
    expect(kept.toUpdate[0].values.official_title).toBe('Estudio A')
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

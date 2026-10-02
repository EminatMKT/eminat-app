import { describe, it, expect } from 'vitest'
import { esActividadDeMiembro, totalesProduccion } from './index'

const owners = (...ids: string[]) => ids.map(usuario_id => ({ usuario_id, es_lider: false }))

describe('totalesProduccion', () => {
  // u1's January sheet: u1 executes one task of 5h/1d and requested another of 8h/2d that u9
  // executes. The listing has both (`esActividadDeMiembro`); the paid figures, only the first.
  const sheet = [
    {
      responsables: owners('u1'),
      solicitante_id: 'u9',
      fecha_inicio: '2026-01-15',
      horas: 5,
      dias_produccion: 1,
    },
    {
      responsables: owners('u9'),
      solicitante_id: 'u1',
      fecha_inicio: '2026-01-15',
      horas: 8,
      dias_produccion: 2,
    },
  ]

  it('sums only what the member executes, not what they requested', () => {
    expect(sheet.filter(a => esActividadDeMiembro(a, 'u1', '2026-01'))).toHaveLength(2)
    expect(totalesProduccion(sheet, 'u1')).toEqual({ horas: 5, dias: 1 })
  })

  it('a task hours are never paid to whoever requested it', () => {
    // Same set, seen from the other side. u1 + u9 = the real total (13h/3d); if requested tasks
    // were summed, it would be 26h/6d — the same hours, twice.
    expect(totalesProduccion(sheet, 'u9')).toEqual({ horas: 8, dias: 2 })
  })

  it('each responsible of a shared task gets its full hours and days; the requester, none', () => {
    // Spec 2026-10-01, "Payroll": each responsible is paid the whole task, as if alone.
    const shared = [
      {
        responsables: owners('u1', 'u2'),
        solicitante_id: 'u9',
        horas: 6,
        dias_produccion: 2,
      },
    ]
    expect(totalesProduccion(shared, 'u1')).toEqual({ horas: 6, dias: 2 })
    expect(totalesProduccion(shared, 'u2')).toEqual({ horas: 6, dias: 2 })
    expect(totalesProduccion(shared, 'u9')).toEqual({ horas: 0, dias: 0 })
  })

  it('ignores missing or non-numeric hours and days', () => {
    const acts = [
      { responsables: owners('u1'), horas: '2.5', dias_produccion: '1' },
      { responsables: owners('u1'), horas: null, dias_produccion: null },
      { responsables: owners('u1') },
    ]
    expect(totalesProduccion(acts, 'u1')).toEqual({ horas: 2.5, dias: 1 })
  })

  it('an empty id sums nothing', () => {
    expect(totalesProduccion(sheet, '')).toEqual({ horas: 0, dias: 0 })
  })
})

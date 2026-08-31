import { describe, it, expect } from 'vitest'
import { esActividadDeMiembro, totalesProduccion } from './report-filter'

const acts = {
  suya:      { responsable_id: 'u1', solicitante_id: 'u9', fecha_inicio: '2026-01-15' },
  pedida:    { responsable_id: 'u9', solicitante_id: 'u1', fecha_inicio: '2026-01-15' },
  ajena:     { responsable_id: 'u9', solicitante_id: 'u8', fecha_inicio: '2026-01-15' },
  otroMes:   { responsable_id: 'u1', solicitante_id: null, fecha_inicio: '2026-03-02' },
  sinMes:    { responsable_id: 'u1', solicitante_id: null, fecha_inicio: null },
  // El bug que motivó todo esto: el MISMO mes, un año después.
  otroAnio:  { responsable_id: 'u1', solicitante_id: null, fecha_inicio: '2027-01-15' },
}

describe('esActividadDeMiembro', () => {
  it('cuenta las que el miembro ejecuta', () => {
    expect(esActividadDeMiembro(acts.suya, 'u1')).toBe(true)
  })
  it('cuenta las que el miembro solicitó', () => {
    expect(esActividadDeMiembro(acts.pedida, 'u1')).toBe(true)
  })
  it('no cuenta las que no son suyas por ningún lado', () => {
    expect(esActividadDeMiembro(acts.ajena, 'u1')).toBe(false)
  })
  it('sin mes no filtra por mes', () => {
    expect(esActividadDeMiembro(acts.otroMes, 'u1')).toBe(true)
    expect(esActividadDeMiembro(acts.sinMes, 'u1')).toBe(true)
  })
  it('con mes exige que coincida, aunque la actividad sea suya', () => {
    expect(esActividadDeMiembro(acts.suya, 'u1', '2026-01')).toBe(true)
    expect(esActividadDeMiembro(acts.otroMes, 'u1', '2026-01')).toBe(false)
  })
  it('con mes también aplica a las solicitadas', () => {
    expect(esActividadDeMiembro(acts.pedida, 'u1', '2026-01')).toBe(true)
    expect(esActividadDeMiembro(acts.pedida, 'u1', '2026-03')).toBe(false)
  })
  it('un id vacío no matchea nada, ni siquiera FK nulas', () => {
    expect(esActividadDeMiembro({ responsable_id: null, solicitante_id: null }, '')).toBe(false)
  })
  it('el reporte de un mes NO incluye ese mes de otro año', () => {
    // Éste es el bug: con `mes = 'Enero'` guardado como texto, esta actividad de 2027 entraba
    // en el reporte de enero de 2026 y las horas se pagaban dos veces.
    expect(esActividadDeMiembro(acts.otroAnio, 'u1', '2026-01')).toBe(false)
    expect(esActividadDeMiembro(acts.otroAnio, 'u1', '2027-01')).toBe(true)
  })
  it('el día no importa: el período es el mes', () => {
    expect(esActividadDeMiembro({ responsable_id: 'u1', fecha_inicio: '2026-01-31' }, 'u1', '2026-01')).toBe(true)
  })
})

describe('totalesProduccion', () => {
  // El reporte de u1 en Enero: ejecuta una de 5h/1d y pidió otra de 8h/2d que
  // ejecuta u9. El listado son las dos (`esActividadDeMiembro`); las cifras
  // remuneradas, solo la primera.
  const reporte = [
    { responsable_id: 'u1', solicitante_id: 'u9', fecha_inicio: '2026-01-15', horas: 5, dias_produccion: 1 },
    { responsable_id: 'u9', solicitante_id: 'u1', fecha_inicio: '2026-01-15', horas: 8, dias_produccion: 2 },
  ]

  it('suma solo lo que el miembro ejecuta, no lo que solicitó', () => {
    expect(reporte.filter(a => esActividadDeMiembro(a, 'u1', '2026-01'))).toHaveLength(2)
    expect(totalesProduccion(reporte, 'u1')).toEqual({ horas: 5, dias: 1 })
  })

  it('las horas de una tarea se pagan una sola vez: al que la ejecuta', () => {
    // Mismo set, visto desde el otro lado. u1 + u9 = el total real (13h/3d);
    // si las solicitadas sumaran, daría 26h/6d — las mismas horas, dos veces.
    expect(totalesProduccion(reporte, 'u9')).toEqual({ horas: 8, dias: 2 })
  })

  it('ignora horas/días ausentes o no numéricos', () => {
    const acts = [
      { responsable_id: 'u1', horas: '2.5', dias_produccion: '1' },
      { responsable_id: 'u1', horas: null, dias_produccion: null },
      { responsable_id: 'u1' },
    ]
    expect(totalesProduccion(acts, 'u1')).toEqual({ horas: 2.5, dias: 1 })
  })

  it('un id vacío no suma nada', () => {
    expect(totalesProduccion(reporte, '')).toEqual({ horas: 0, dias: 0 })
  })
})

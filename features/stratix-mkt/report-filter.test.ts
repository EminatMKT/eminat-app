import { describe, it, expect } from 'vitest'
import { esActividadDeMiembro, totalesProduccion } from './report-filter'

const acts = {
  suya:      { responsable_id: 'u1', solicitante_id: 'u9', mes: 'Enero' },
  pedida:    { responsable_id: 'u9', solicitante_id: 'u1', mes: 'Enero' },
  ajena:     { responsable_id: 'u9', solicitante_id: 'u8', mes: 'Enero' },
  otroMes:   { responsable_id: 'u1', solicitante_id: null, mes: 'Marzo' },
  sinMes:    { responsable_id: 'u1', solicitante_id: null, mes: null },
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
    expect(esActividadDeMiembro(acts.suya, 'u1', 'Enero')).toBe(true)
    expect(esActividadDeMiembro(acts.otroMes, 'u1', 'Enero')).toBe(false)
  })
  it('con mes también aplica a las solicitadas', () => {
    expect(esActividadDeMiembro(acts.pedida, 'u1', 'Enero')).toBe(true)
    expect(esActividadDeMiembro(acts.pedida, 'u1', 'Marzo')).toBe(false)
  })
  it('un id vacío no matchea nada, ni siquiera FK nulas', () => {
    expect(esActividadDeMiembro({ responsable_id: null, solicitante_id: null }, '')).toBe(false)
  })
})

describe('totalesProduccion', () => {
  // El reporte de u1 en Enero: ejecuta una de 5h/1d y pidió otra de 8h/2d que
  // ejecuta u9. El listado son las dos (`esActividadDeMiembro`); las cifras
  // remuneradas, solo la primera.
  const reporte = [
    { responsable_id: 'u1', solicitante_id: 'u9', mes: 'Enero', horas: 5, dias_produccion: 1 },
    { responsable_id: 'u9', solicitante_id: 'u1', mes: 'Enero', horas: 8, dias_produccion: 2 },
  ]

  it('suma solo lo que el miembro ejecuta, no lo que solicitó', () => {
    expect(reporte.filter(a => esActividadDeMiembro(a, 'u1', 'Enero'))).toHaveLength(2)
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

import { describe, it, expect } from 'vitest'
import { esActividadDeMiembro } from './report-filter'

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

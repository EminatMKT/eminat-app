import { describe, it, expect } from 'vitest'
import { esActividadDeMiembro } from './report-filter'

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
  it('no cuenta tareas solicitadas que ejecuta otra persona', () => {
    expect(esActividadDeMiembro(acts.pedida, 'u1')).toBe(false)
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
  it('con mes tampoco incluye las tareas solicitadas a otra persona', () => {
    expect(esActividadDeMiembro(acts.pedida, 'u1', '2026-01')).toBe(false)
    expect(esActividadDeMiembro(acts.pedida, 'u1', '2026-03')).toBe(false)
  })
  it('un id vacío no matchea nada, ni siquiera FK nulas', () => {
    expect(esActividadDeMiembro({ responsable_id: null }, '')).toBe(false)
  })
  it('el reporte de un mes NO incluye ese mes de otro año', () => {
    // El filtro usa año y mes, no únicamente el nombre del mes.
    expect(esActividadDeMiembro(acts.otroAnio, 'u1', '2026-01')).toBe(false)
    expect(esActividadDeMiembro(acts.otroAnio, 'u1', '2027-01')).toBe(true)
  })
  it('el día no importa: el período es el mes', () => {
    expect(esActividadDeMiembro({ responsable_id: 'u1', fecha_inicio: '2026-01-31' }, 'u1', '2026-01')).toBe(true)
  })
})

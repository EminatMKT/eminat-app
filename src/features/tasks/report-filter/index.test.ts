import { describe, it, expect } from 'vitest'
import { esActividadDeMiembro } from './index'

const owners = (...ids: string[]) => ids.map(usuario_id => ({ usuario_id, es_lider: false }))

const acts = {
  suya:      { responsables: owners('u1'), solicitante_id: 'u9', fecha_inicio: '2026-01-15' },
  pedida:    { responsables: owners('u9'), solicitante_id: 'u1', fecha_inicio: '2026-01-15' },
  ajena:     { responsables: owners('u9'), solicitante_id: 'u8', fecha_inicio: '2026-01-15' },
  otroMes:   { responsables: owners('u1'), solicitante_id: null, fecha_inicio: '2026-03-02' },
  sinMes:    { responsables: owners('u1'), solicitante_id: null, fecha_inicio: null },
  // El bug que motivó todo esto: el MISMO mes, un año después.
  otroAnio:  { responsables: owners('u1'), solicitante_id: null, fecha_inicio: '2027-01-15' },
  // Several responsibles: the task belongs to the sheet of each one (spec 2026-10-01, "Payroll").
  compartida: { responsables: owners('u1', 'u2'), solicitante_id: 'u9', fecha_inicio: '2026-01-15' },
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
  it('a task with responsibles A and B is on A sheet and on B sheet', () => {
    expect(esActividadDeMiembro(acts.compartida, 'u1', '2026-01')).toBe(true)
    expect(esActividadDeMiembro(acts.compartida, 'u2', '2026-01')).toBe(true)
    expect(esActividadDeMiembro(acts.compartida, 'u3', '2026-01')).toBe(false)
  })
  it('the requester still matches a task with several responsibles', () => {
    expect(esActividadDeMiembro(acts.compartida, 'u9', '2026-01')).toBe(true)
  })
  it('a task with no responsibles only matches its requester', () => {
    const nobody = { ...acts.compartida, responsables: [] }
    expect(esActividadDeMiembro(nobody, 'u9')).toBe(true)
    expect(esActividadDeMiembro(nobody, 'u1')).toBe(false)
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
    expect(esActividadDeMiembro({ responsables: null, solicitante_id: null }, '')).toBe(false)
  })
  it('el reporte de un mes NO incluye ese mes de otro año', () => {
    // Éste es el bug: con `mes = 'Enero'` guardado como texto, esta actividad de 2027 entraba
    // en el reporte de enero de 2026 y las horas se pagaban dos veces.
    expect(esActividadDeMiembro(acts.otroAnio, 'u1', '2026-01')).toBe(false)
    expect(esActividadDeMiembro(acts.otroAnio, 'u1', '2027-01')).toBe(true)
  })
  it('el día no importa: el período es el mes', () => {
    expect(esActividadDeMiembro({ responsables: owners('u1'), fecha_inicio: '2026-01-31' }, 'u1', '2026-01')).toBe(true)
  })
})

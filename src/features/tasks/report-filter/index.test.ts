import { describe, it, expect } from 'vitest'
import { esActividadDeMiembro } from './index'

const owners = (...ids: string[]) => ids.map(usuario_id => ({ usuario_id, es_lider: false }))

const acts = {
  suya:      { responsables: owners('u1'), solicitante_id: 'u9', fecha_inicio: '2026-01-15' },
  pedida:    { responsables: owners('u9'), solicitante_id: 'u1', fecha_inicio: '2026-01-15' },
  ajena:     { responsables: owners('u9'), solicitante_id: 'u8', fecha_inicio: '2026-01-15' },
  otroMes:   { responsables: owners('u1'), solicitante_id: null, fecha_inicio: '2026-03-02' },
  sinMes:    { responsables: owners('u1'), solicitante_id: null, fecha_inicio: null },
  // The bug that started all this: the SAME month, one year later.
  otroAnio:  { responsables: owners('u1'), solicitante_id: null, fecha_inicio: '2027-01-15' },
  // Several responsibles: the task belongs to the sheet of each one (spec 2026-10-01, "Payroll").
  compartida: { responsables: owners('u1', 'u2'), solicitante_id: 'u9', fecha_inicio: '2026-01-15' },
}

describe('esActividadDeMiembro', () => {
  it('counts the tasks the member executes', () => {
    expect(esActividadDeMiembro(acts.suya, 'u1')).toBe(true)
  })
  it('counts the tasks the member requested', () => {
    expect(esActividadDeMiembro(acts.pedida, 'u1')).toBe(true)
  })
  it('does not count tasks that are theirs by no side', () => {
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
  it('without a month it does not filter by month', () => {
    expect(esActividadDeMiembro(acts.otroMes, 'u1')).toBe(true)
    expect(esActividadDeMiembro(acts.sinMes, 'u1')).toBe(true)
  })
  it('with a month it must match, even when the task is theirs', () => {
    expect(esActividadDeMiembro(acts.suya, 'u1', '2026-01')).toBe(true)
    expect(esActividadDeMiembro(acts.otroMes, 'u1', '2026-01')).toBe(false)
  })
  it('the month applies to requested tasks too', () => {
    expect(esActividadDeMiembro(acts.pedida, 'u1', '2026-01')).toBe(true)
    expect(esActividadDeMiembro(acts.pedida, 'u1', '2026-03')).toBe(false)
  })
  it('an empty id matches nothing, not even null FKs', () => {
    expect(esActividadDeMiembro({ responsables: null, solicitante_id: null }, '')).toBe(false)
  })
  it('the report of a month does NOT include that month of another year', () => {
    // This is the bug: with `mes = 'Enero'` stored as text, this 2027 task entered the January
    // 2026 report and its hours were paid twice.
    expect(esActividadDeMiembro(acts.otroAnio, 'u1', '2026-01')).toBe(false)
    expect(esActividadDeMiembro(acts.otroAnio, 'u1', '2027-01')).toBe(true)
  })
  it('the day does not matter: the period is the month', () => {
    expect(esActividadDeMiembro({ responsables: owners('u1'), fecha_inicio: '2026-01-31' }, 'u1', '2026-01')).toBe(true)
  })
})

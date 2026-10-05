import { describe, it, expect } from 'vitest'
import { datosTarjeta } from './index'

const hoy = new Date('2026-08-25T12:00:00')
const names = { u1: 'Ana Bravo', u2: 'Beto Medico', u3: 'Carla Diaz' }
const member = (usuario_id: string, es_lider = false) => ({ usuario_id, es_lider })

describe('datosTarjeta', () => {
  it('a past delivery that is not completed is overdue', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-08-20', estado: 'Pendiente' }, names, 'es-ES', hoy).vencida).toBe(true)
  })

  it('a past delivery that is COMPLETED is not overdue: it was delivered', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-08-20', estado: 'Completado' }, names, 'es-ES', hoy).vencida).toBe(false)
  })

  it('a future delivery is not overdue', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-09-10', estado: 'Pendiente' }, names, 'es-ES', hoy).vencida).toBe(false)
  })

  it('without a date there is neither overdue nor delivery text', () => {
    const d = datosTarjeta({ estado: 'Pendiente' }, names, 'es-ES', hoy)
    expect(d.vencida).toBe(false)
    expect(d.entrega).toBe('')
  })

  it('the date is read in LOCAL time, not in UTC', () => {
    // In UTC-4, `new Date('2026-07-30')` lands on the 29th at 20:00 and would show "29 jul".
    expect(datosTarjeta({ fecha_entrega: '2026-07-30' }, names, 'es-ES', hoy).entrega).toContain('30')
  })

  it('the initial falls back to ? when nobody is responsible', () => {
    expect(datosTarjeta({ responsables: [] }, names, 'es-ES', hoy).inicial).toBe('?')
    expect(datosTarjeta({ responsables: [member('u2')] }, names, 'es-ES', hoy).inicial).toBe('B')
  })

  // The card shows one name: the leader if there is one, else the first alphabetically.
  it('with a leader the compact label starts with the leader and counts the rest', () => {
    const a = { responsables: [member('u1'), member('u3', true), member('u2')] }
    const d = datosTarjeta(a, names, 'es-ES', hoy)
    expect(d.responsable).toEqual({ label: 'Carla Diaz +2', lider: true })
    expect(d.inicial).toBe('C')
  })

  it('without a leader the compact label picks the first name alphabetically, no crown', () => {
    const a = { responsables: [member('u3'), member('u2'), member('u1')] }
    expect(datosTarjeta(a, names, 'es-ES', hoy).responsable).toEqual({ label: 'Ana Bravo +2', lider: false })
  })

  it('with nobody responsible the compact label is —', () => {
    expect(datosTarjeta({ responsables: [] }, names, 'es-ES', hoy).responsable).toEqual({ label: '—', lider: false })
  })

  // The period is the month the task is CHARGED to, and it comes from `fecha_inicio`, not from the
  // delivery: an August task delivered in September is paid in August.
  it('the period comes from fecha_inicio, with its year and in the viewer language', () => {
    const a = { fecha_inicio: '2026-08-17', fecha_entrega: '2026-09-02' }
    expect(datosTarjeta(a, names, 'en-US', hoy).periodo).toBe('Aug 2026')
    expect(datosTarjeta(a, names, 'es-EC', hoy).periodo).toContain('2026')
  })

  it('without fecha_inicio the period is empty: the JSX separator disappears with it', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-09-02' }, names, 'es-EC', hoy).periodo).toBe('')
  })
})

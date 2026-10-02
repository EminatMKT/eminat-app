import { describe, it, expect } from 'vitest'
import { datosTarjeta } from './index'

const hoy = new Date('2026-08-25T12:00:00')
const names = { u1: 'Ana Bravo', u2: 'Beto Medico', u3: 'Carla Diaz' }
const member = (usuario_id: string, es_lider = false) => ({ usuario_id, es_lider })

describe('datosTarjeta', () => {
  it('una entrega pasada y sin completar está vencida', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-08-20', estado: 'Pendiente' }, names, 'es-ES', hoy).vencida).toBe(true)
  })

  it('una entrega pasada pero COMPLETADA no está vencida: ya se entregó', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-08-20', estado: 'Completado' }, names, 'es-ES', hoy).vencida).toBe(false)
  })

  it('una entrega futura no está vencida', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-09-10', estado: 'Pendiente' }, names, 'es-ES', hoy).vencida).toBe(false)
  })

  it('sin fecha no hay vencimiento ni texto de entrega', () => {
    const d = datosTarjeta({ estado: 'Pendiente' }, names, 'es-ES', hoy)
    expect(d.vencida).toBe(false)
    expect(d.entrega).toBe('')
  })

  it('la fecha se lee en hora LOCAL, no en UTC', () => {
    // En UTC-4, `new Date('2026-07-30')` cae el 29 a las 20:00 y mostraría "29 jul".
    expect(datosTarjeta({ fecha_entrega: '2026-07-30' }, names, 'es-ES', hoy).entrega).toContain('30')
  })

  it('la inicial cae a ? cuando no hay responsable', () => {
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

  // El período es el mes al que se IMPUTA la tarea, y sale de `fecha_inicio`, no de la entrega:
  // una tarea de agosto que se entrega en septiembre se paga en agosto.
  it('el período sale de fecha_inicio, con su año y en el idioma de quien mira', () => {
    const a = { fecha_inicio: '2026-08-17', fecha_entrega: '2026-09-02' }
    expect(datosTarjeta(a, names, 'en-US', hoy).periodo).toBe('Aug 2026')
    expect(datosTarjeta(a, names, 'es-EC', hoy).periodo).toContain('2026')
  })

  it('sin fecha_inicio el período es vacío: el separador del JSX desaparece con él', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-09-02' }, names, 'es-EC', hoy).periodo).toBe('')
  })
})

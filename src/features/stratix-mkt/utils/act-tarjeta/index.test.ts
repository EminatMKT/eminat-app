import { describe, it, expect } from 'vitest'
import { datosTarjeta } from './index'

const hoy = new Date('2026-08-25T12:00:00')

describe('datosTarjeta', () => {
  it('una entrega pasada y sin completar está vencida', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-08-20', estado: 'Pendiente' }, 'Ana', 'es-ES', hoy).vencida).toBe(true)
  })

  it('una entrega pasada pero COMPLETADA no está vencida: ya se entregó', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-08-20', estado: 'Completado' }, 'Ana', 'es-ES', hoy).vencida).toBe(false)
  })

  it('una entrega futura no está vencida', () => {
    expect(datosTarjeta({ fecha_entrega: '2026-09-10', estado: 'Pendiente' }, 'Ana', 'es-ES', hoy).vencida).toBe(false)
  })

  it('sin fecha no hay vencimiento ni texto de entrega', () => {
    const d = datosTarjeta({ estado: 'Pendiente' }, 'Ana', 'es-ES', hoy)
    expect(d.vencida).toBe(false)
    expect(d.entrega).toBe('')
  })

  it('la fecha se lee en hora LOCAL, no en UTC', () => {
    // En UTC-4, `new Date('2026-07-30')` cae el 29 a las 20:00 y mostraría "29 jul".
    expect(datosTarjeta({ fecha_entrega: '2026-07-30' }, 'Ana', 'es-ES', hoy).entrega).toContain('30')
  })

  it('la inicial cae a ? cuando no hay responsable', () => {
    expect(datosTarjeta({}, undefined, 'es-ES', hoy).inicial).toBe('?')
    expect(datosTarjeta({}, 'Beto', 'es-ES', hoy).inicial).toBe('B')
  })
})

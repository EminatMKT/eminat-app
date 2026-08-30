import { describe, it, expect } from 'vitest'
import { horaCorta } from './index'

describe('horaCorta', () => {
  // El motivo de que exista: `hora.slice(0, 5)` imprimía 24h SIEMPRE, así que en inglés se leía
  // "15:00" donde corresponde "3:00 PM". Si 12h o 24h no es decisión nuestra: la trae el locale.
  it('sigue el formato del idioma, no uno fijo', () => {
    expect(horaCorta('15:00:00', 'en-US')).toBe('3:00 PM')
    expect(horaCorta('15:00:00', 'es-EC')).toBe('3:00 p. m.')
  })

  it('acepta HH:MM y HH:MM:SS por igual', () => {
    expect(horaCorta('09:30', 'en-US')).toBe('9:30 AM')
    expect(horaCorta('09:30:00', 'en-US')).toBe('9:30 AM')
  })

  // Medianoche es el caso que rompe un guard escrito con `!h`: 0 es válido y falsy a la vez.
  it('medianoche no se toma por vacía', () => {
    expect(horaCorta('00:00', 'en-US')).toBe('12:00 AM')
  })

  it('una hora vacía o rota no rompe', () => {
    expect(horaCorta('', 'en-US')).toBe('—')
    expect(horaCorta('no-es-hora', 'en-US')).toBe('no-es-hora')
  })
})

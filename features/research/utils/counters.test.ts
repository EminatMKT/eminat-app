import { describe, it, expect } from 'vitest'
import { nextCount, totalEmails, cadenceBreakdown } from './counters'

describe('nextCount (el botón + del pop-up)', () => {
  it('un lead sin contador arranca en 1 al registrar el primer correo', () => {
    expect(nextCount(null)).toBe(1)
  })

  it('incrementa de a uno', () => {
    expect(nextCount(2)).toBe(3)
  })
})

describe('totalEmails (la KPI card del 28/08)', () => {
  it('suma los contadores de todos los leads', () => {
    expect(totalEmails([{ email_count: 3 }, { email_count: 2 }, { email_count: 1 }])).toBe(6)
  })

  it('un lead sin contador cuenta como 0, no rompe la suma', () => {
    expect(totalEmails([{ email_count: 3 }, {}, { email_count: null }])).toBe(3)
  })

  it('sin leads es 0, no NaN', () => {
    expect(totalEmails([])).toBe(0)
  })
})

describe('cadenceBreakdown (leads con 1, 2 o 3 toques)', () => {
  it('agrupa los leads por cantidad de toques', () => {
    expect(cadenceBreakdown([{ email_count: 1 }, { email_count: 2 }, { email_count: 2 }, { email_count: 3 }]))
      .toEqual({ one: 1, two: 2, threePlus: 1 })
  })

  it('los leads sin correos no entran en ningún grupo', () => {
    expect(cadenceBreakdown([{ email_count: 0 }, { email_count: null }, {}]))
      .toEqual({ one: 0, two: 0, threePlus: 0 })
  })

  it('la cadencia es de 3 toques, así que 4 o más caen en el grupo de 3+', () => {
    expect(cadenceBreakdown([{ email_count: 5 }]).threePlus).toBe(1)
  })
})

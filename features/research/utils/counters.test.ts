import { describe, it, expect } from 'vitest'
import { nextCount, totalEmails } from './counters'

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

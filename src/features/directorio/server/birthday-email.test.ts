import { describe, expect, it } from 'vitest'
import { buildBirthdayEmail, guayaquilBirthdayDate } from './birthday-email'

describe('Directory birthday email', () => {
  it('uses Guayaquil local date near midnight UTC', () => {
    expect(guayaquilBirthdayDate(new Date('2026-10-14T02:30:00Z'))).toBe('2026-10-13')
  })

  it('renders a short institutional message and escapes the recipient name', () => {
    const message = buildBirthdayEmail('<Tasha> Palomino')
    expect(message.subject).toContain('<Tasha>')
    expect(message.html).toContain('&lt;Tasha&gt;')
    expect(message.html).not.toContain('<Tasha>')
    expect(message.text).toContain('Equipo Stratix')
  })
})

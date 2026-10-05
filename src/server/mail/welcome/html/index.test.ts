import { describe, it, expect } from 'vitest'
import WELCOME_COPY from '../copy'
import buildWelcomeEmail from './index'

const ARGS = {
  nombre: 'Ana <b>',
  apellido: 'Paz',
  email: 'ana@eminat.net',
  password: 'secret-123',
  areaLabel: 'Marketing',
}

describe('buildWelcomeEmail', () => {
  it('is a whole document greeting the person by their escaped name', () => {
    const html = buildWelcomeEmail(ARGS)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html.trimEnd().endsWith('</html>')).toBe(true)
    expect(html).toContain(`${WELCOME_COPY.greeting}, Ana &lt;b&gt;`)
  })
  it('carries the credentials block and the closing action', () => {
    const html = buildWelcomeEmail(ARGS)
    expect(html).toContain('secret-123')
    expect(html).toContain(WELCOME_COPY.button)
  })
})

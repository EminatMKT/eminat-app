import { describe, expect, it } from 'vitest'
import ADMIN_ERRORS from '.'

const DETAIL = 'boom'
const USER_ID = 'u1'
const NAME = 'Ana Pérez'
const SPANISH_MARKS = /[áéíóúñ¿¡]|\b(?:requerido|usuario|correo|contraseña)\b/i

const messages = Object.values(ADMIN_ERRORS).map(entry =>
  typeof entry === 'function' ? entry(DETAIL, USER_ID) : entry,
)

describe('ADMIN_ERRORS', () => {
  it.each(messages)('"%s" is written in English', message => {
    expect(message).not.toMatch(SPANISH_MARKS)
  })

  it('carries the detail into the messages that interpolate it', () => {
    expect(ADMIN_ERRORS.lookupFailed(DETAIL)).toContain(DETAIL)
    expect(ADMIN_ERRORS.authNote(USER_ID, DETAIL)).toContain(USER_ID)
    expect(ADMIN_ERRORS.emailTaken(NAME)).toContain(NAME)
  })

  it('names the last-admin guard the e2e suite checks', () => {
    expect(ADMIN_ERRORS.lastAdminDemote).toContain('last admin')
  })
})

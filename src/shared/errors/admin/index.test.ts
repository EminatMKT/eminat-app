import { describe, expect, it } from 'vitest'
import ADMIN_ERRORS from '.'

const DETAIL = 'boom'
const USER_ID = 'u1'
const NAME = 'Ana Pérez'
const SPANISH_MARKS = /[áéíóúñ¿¡]|\b(?:requerido|usuario|correo|contraseña)\b/i

const isText = (entry: unknown): entry is string => typeof entry === 'string'
const messages = Object.values(ADMIN_ERRORS).filter(isText)

describe('ADMIN_ERRORS', () => {
  it.each(messages)('"%s" is written in English', message => {
    expect(message).not.toMatch(SPANISH_MARKS)
  })

  it('carries the detail into the messages that interpolate it', () => {
    expect(ADMIN_ERRORS.lookupFailed(DETAIL)).toContain(DETAIL)
    expect(ADMIN_ERRORS.authNote(USER_ID, DETAIL)).toContain(USER_ID)
    expect(ADMIN_ERRORS.emailTaken(NAME)).toContain(NAME)
    expect(ADMIN_ERRORS.missingField(DETAIL)).toContain(DETAIL)
    expect(ADMIN_ERRORS.inUse(3)).toContain('3')
  })

  it('names the last-admin guard the e2e suite checks', () => {
    expect(ADMIN_ERRORS.lastAdminDemote).toContain('last admin')
  })
})

import { describe, it, expect } from 'vitest'
import CREATE_FIXTURES from '@/server/admin/users/create/fixtures'
import createUserContract from '.'

const VALID = CREATE_FIXTURES.newUser
const firstIssue = (body: unknown) => createUserContract(body).error?.issues[0]?.message

describe('createUserContract', () => {
  it('accepts the four required fields and keeps the optional ones it was sent', () => {
    const verdict = createUserContract({ ...VALID, rol: 'mkt', cargoIds: ['c-1'] })
    expect(verdict.success).toBe(true)
    expect(verdict.data).toMatchObject({ ...VALID, rol: 'mkt', cargoIds: ['c-1'] })
  })
  it('a missing or empty required field is requiredFields', () => {
    expect(firstIssue({ ...VALID, nombre: '' })).toBe('requiredFields')
    expect(firstIssue({ ...VALID, email: undefined })).toBe('requiredFields')
    expect(firstIssue({ ...VALID, password: '' })).toBe('requiredFields')
  })
  it('a short password is passwordTooShort, but only once the required fields are there', () => {
    expect(firstIssue({ ...VALID, password: 'short' })).toBe('passwordTooShort')
    expect(firstIssue({ ...VALID, password: 'short', apellido: '' })).toBe('requiredFields')
  })
  it('a password that is not text is passwordTooShort, as before', () => {
    expect(firstIssue({ ...VALID, password: 12345678 })).toBe('passwordTooShort')
  })
})

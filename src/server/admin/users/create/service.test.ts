import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ADMIN_ERRORS } from '@/shared/errors'
import createUser from './service'

const fakes = vi.hoisted(() => {
  const repo = {
    findByEmail: vi.fn(),
    createAuth: vi.fn(),
    deleteAuth: vi.fn(),
    insertRow: vi.fn(),
    linkRow: vi.fn(),
    syncCargos: vi.fn(),
    cargoNames: vi.fn(),
    roleLabel: vi.fn(),
  }
  const deps = { repo, sendWelcome: vi.fn() }
  return deps
})
const { repo } = fakes
const NAMES = { nombre: 'Ana', apellido: 'Paz' }
const INPUT = { ...NAMES, email: 'ana@eminat.net', password: 'secret-123' }
const ORPHAN_ROW = { ...NAMES, id: 'u-old', auth_id: null }
const SAVED = { id: 'a-1', nombre: 'Ana' }
const CREATED = { ok: true, data: { user: SAVED, emailWarning: null } }

describe('createUser', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    repo.findByEmail.mockResolvedValue(null)
    repo.createAuth.mockResolvedValue({ id: 'a-1', error: null })
    repo.insertRow.mockResolvedValue({ data: SAVED, error: null })
    repo.linkRow.mockResolvedValue({ data: SAVED, error: null })
    repo.deleteAuth.mockResolvedValue(null)
    repo.cargoNames.mockResolvedValue('')
    fakes.sendWelcome.mockResolvedValue(null)
  })
  it('a new email creates the Auth account and inserts the row keyed by it', async () => {
    expect(await createUser(INPUT, fakes)).toEqual(CREATED)
    expect(repo.insertRow.mock.calls[0][0]).toMatchObject({ id: 'a-1', auth_id: 'a-1' })
  })
  it('an email whose row already has an account is emailTaken, and no Auth account is made', async () => {
    repo.findByEmail.mockResolvedValue({ ...ORPHAN_ROW, auth_id: 'a-0' })
    const result = await createUser(INPUT, fakes)
    expect(result).toEqual({ ok: false, error: 'emailTaken', message: ADMIN_ERRORS.emailTaken('Ana Paz') })
    expect(repo.createAuth).not.toHaveBeenCalled()
  })
  it('a row without an account is linked by its own id, not duplicated', async () => {
    repo.findByEmail.mockResolvedValue(ORPHAN_ROW)
    expect(await createUser(INPUT, fakes)).toEqual(CREATED)
    expect(repo.linkRow.mock.calls[0][0]).toBe('u-old')
    expect(repo.insertRow).not.toHaveBeenCalled()
  })
  it('a failed Auth creation answers its message under authCreateFailed', async () => {
    repo.createAuth.mockResolvedValue({ error: { message: 'already registered' } })
    expect(await createUser(INPUT, fakes)).toEqual({ ok: false, error: 'authCreateFailed', message: 'already registered' })
  })
  it('a failed row write rolls the Auth account back', async () => {
    repo.insertRow.mockResolvedValue({ data: null, error: { message: 'dupe', code: '23505' } })
    const result = await createUser(INPUT, fakes)
    expect(result.error).toBe('authRollbackDone')
    expect(repo.deleteAuth).toHaveBeenCalledWith('a-1')
  })
  it('an unexpected throw after the Auth account exists also rolls it back', async () => {
    repo.insertRow.mockRejectedValue(new Error('network'))
    expect(await createUser(INPUT, fakes)).toEqual({ ok: false, error: 'unexpectedCreate', message: 'network' })
    expect(repo.deleteAuth).toHaveBeenCalledWith('a-1')
  })
})

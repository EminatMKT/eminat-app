import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ADMIN_ERRORS } from '@/shared/errors'
import CREATE_FIXTURES from '@/server/admin/users/create/fixtures'
import createUser from '.'

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
const { newUser: INPUT, orphanRow: ORPHAN_ROW } = CREATE_FIXTURES
const SAVED = { id: 'a-1', nombre: 'Ana' }
const CREATED = { ok: true, data: { user: SAVED, emailWarning: null } }
const SAVED_ROW = { data: SAVED, error: null }
const INSERT_MATCH = { id: 'a-1', auth_id: 'a-1' }
const AUTH_CREATED = { id: 'a-1', error: null }
const TAKEN_ROW = { ...ORPHAN_ROW, auth_id: 'a-0' }
const TAKEN = { ok: false, error: 'emailTaken', message: ADMIN_ERRORS.emailTaken('Ana Paz') }
const AUTH_FAILED = { error: { message: 'already registered' } }
const AUTH_FAILED_RESULT = { ok: false, error: 'authCreateFailed', message: 'already registered' }
const DUPE_ROW = { data: null, error: { message: 'dupe', code: '23505' } }
const UNEXPECTED = { ok: false, error: 'unexpectedCreate', message: 'network' }

describe('createUser', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    repo.findByEmail.mockResolvedValue(null)
    repo.createAuth.mockResolvedValue(AUTH_CREATED)
    repo.insertRow.mockResolvedValue(SAVED_ROW)
    repo.linkRow.mockResolvedValue(SAVED_ROW)
    repo.deleteAuth.mockResolvedValue(null)
    repo.cargoNames.mockResolvedValue('')
    fakes.sendWelcome.mockResolvedValue(null)
  })
  it('a new email creates the Auth account and inserts the row keyed by it', async () => {
    expect(await createUser(INPUT, fakes)).toEqual(CREATED)
    expect(repo.insertRow.mock.calls[0][0]).toMatchObject(INSERT_MATCH)
  })
  it('an email whose row already has an account is emailTaken, and no Auth account is made', async () => {
    repo.findByEmail.mockResolvedValue(TAKEN_ROW)
    const result = await createUser(INPUT, fakes)
    expect(result).toEqual(TAKEN)
    expect(repo.createAuth).not.toHaveBeenCalled()
  })
  it('a row without an account is linked by its own id, not duplicated', async () => {
    repo.findByEmail.mockResolvedValue(ORPHAN_ROW)
    expect(await createUser(INPUT, fakes)).toEqual(CREATED)
    expect(repo.linkRow.mock.calls[0][0]).toBe('u-old')
    expect(repo.insertRow).not.toHaveBeenCalled()
  })
  it('a failed Auth creation answers its message under authCreateFailed', async () => {
    repo.createAuth.mockResolvedValue(AUTH_FAILED)
    expect(await createUser(INPUT, fakes)).toEqual(AUTH_FAILED_RESULT)
  })
  it('a failed row write rolls the Auth account back', async () => {
    repo.insertRow.mockResolvedValue(DUPE_ROW)
    const result = await createUser(INPUT, fakes)
    expect(result.error).toBe('authRollbackDone')
    expect(repo.deleteAuth).toHaveBeenCalledWith('a-1')
  })
  it('an unexpected throw after the Auth account exists also rolls it back', async () => {
    repo.insertRow.mockRejectedValue(new Error('network'))
    expect(await createUser(INPUT, fakes)).toEqual(UNEXPECTED)
    expect(repo.deleteAuth).toHaveBeenCalledWith('a-1')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ADMIN_ERRORS } from '@/shared/errors'

const fakes = vi.hoisted(() => {
  const fake = { requireAdmin: vi.fn(), createUser: vi.fn(), repo: {} }
  return fake
})
vi.mock('@/shared/db/server', () => ({ requireAdmin: fakes.requireAdmin, usersRepo: () => fakes.repo }))
vi.mock('@/server/mail/welcome', () => ({ default: vi.fn() }))
vi.mock('./service', () => ({ default: fakes.createUser }))

import createUserHandler from './handler'

const URL = 'http://localhost/api/admin/create-user'
const post = (body: string) => {
  const init = { method: 'POST', body }
  return new Request(URL, init)
}
const BODY = {
  email: 'ana@eminat.net',
  password: 'secret-123',
  nombre: 'Ana',
  apellido: 'Paz',
}
const VALID = JSON.stringify(BODY)
const CREATED = { ok: true, data: { user: { id: 'a-1' }, emailWarning: null } }
const TAKEN = { ok: false, error: 'emailTaken', message: 'Ana has an account.' }
const ROLLED_BACK = {
  ok: false,
  error: 'authRollbackDone',
  message: 'dupe.',
  extra: { dbErrorCode: '23505' },
}

describe('createUserHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    fakes.requireAdmin.mockResolvedValue({ ok: true, userId: 'admin-1' })
  })
  it('a caller who is not admin gets the guard answer and nothing runs', async () => {
    fakes.requireAdmin.mockResolvedValue({ ok: false, status: 403, error: 'Admin only.' })
    const res = await createUserHandler(post(VALID))
    expect(res.status).toBe(403)
    expect(fakes.createUser).not.toHaveBeenCalled()
  })
  it('missing fields are 400 requiredFields; a short password is 400 passwordTooShort', async () => {
    const missing = await createUserHandler(post('{}'))
    expect(missing.status).toBe(400)
    expect(await missing.json()).toEqual({ error: ADMIN_ERRORS.requiredFields })
    const short = await createUserHandler(post(VALID.replace('secret-123', 'short')))
    expect(await short.json()).toEqual({ error: ADMIN_ERRORS.passwordTooShort })
  })
  it('a created user is 201 with { user, emailWarning }, built with the repo and the mailer', async () => {
    fakes.createUser.mockResolvedValue(CREATED)
    const res = await createUserHandler(post(VALID))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ user: { id: 'a-1' }, emailWarning: null })
    expect(fakes.createUser.mock.calls[0][1].repo).toBe(fakes.repo)
  })
  it('a taken email is 409 and a rolled-back row is 400 with its dbErrorCode', async () => {
    fakes.createUser.mockResolvedValueOnce(TAKEN)
    expect((await createUserHandler(post(VALID))).status).toBe(409)
    fakes.createUser.mockResolvedValueOnce(ROLLED_BACK)
    const rolledBack = await createUserHandler(post(VALID))
    expect(rolledBack.status).toBe(400)
    expect(await rolledBack.json()).toEqual({ error: 'dupe.', dbErrorCode: '23505' })
  })
  it('a body that is not JSON is 500 with the parser message', async () => {
    const res = await createUserHandler(post('not json'))
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toBe('')
  })
})

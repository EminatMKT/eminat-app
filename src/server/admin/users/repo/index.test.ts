import { describe, it, expect, vi, beforeEach } from 'vitest'

const fakes = vi.hoisted(() => {
  const calls: unknown[][] = []
  const answer: { data: unknown; error: unknown } = { data: null, error: null }
  const step = (name: string) => (...args: unknown[]) => { calls.push([name, ...args]); return query }
  const settle = async () => ({ ...answer })
  const query = {
    select: step('select'),
    eq: step('eq'),
    insert: step('insert'),
    update: step('update'),
    maybeSingle: settle,
    single: settle,
  }
  const admin = { createUser: vi.fn(), deleteUser: vi.fn() }
  const from = (table: string) => { calls.push(['from', table]); return query }
  const db = { from, auth: { admin } }
  const fake = {
    calls,
    answer,
    admin,
    db,
  }
  return fake
})
vi.mock('@/server/db', () => ({ supabaseAdmin: () => fakes.db, syncUsuarioCargos: vi.fn(), cargoNames: vi.fn() }))

import usersRepo from './index'

const NAMES = { nombre: 'Ana', apellido: 'Paz' }; const FLAGS = { activo: true, validado: true, rol: 'x' }
const LOOK = { color: '#000', ubicacion: 'X', auth_id: 'a-1' }; const INSERTED = { id: 'a-1' }
const ROW = { ...NAMES, ...FLAGS, ...LOOK }
const FOUND = { ...NAMES, id: 'u-1', auth_id: null }
const DUPE = { message: 'dupe', code: '23505' }
const ATTRS = { email: 'ana@eminat.net', password: 'secret-123', email_confirm: true }
const AUTH_RESPONSE = { data: { user: INSERTED }, error: null }; const AUTH_CREATED = { id: 'a-1', error: null }
const LINK_FAILED = { data: null, error: DUPE }; const INSERTED_RESULT = { data: INSERTED, error: null }
const ROLE_ROW = { label: 'Marketing' }; const DELETE_FAILED = { error: { message: 'gone' } }
const DELETE_ERROR = { message: 'gone' }
const answer = (data: unknown, error: unknown = null) => { fakes.answer.data = data; fakes.answer.error = error }

describe('usersRepo', () => {
  beforeEach(() => { fakes.calls.length = 0; answer(null) })

  it('finds a usuarios row by email', async () => {
    answer(FOUND)
    expect(await usersRepo().findByEmail('ana@eminat.net')).toEqual(FOUND)
    expect(fakes.calls).toContainEqual(['from', 'usuarios'])
    expect(fakes.calls).toContainEqual(['eq', 'email', 'ana@eminat.net'])
  })
  it('creates the Auth account already confirmed, and flattens the answer', async () => {
    fakes.admin.createUser.mockResolvedValueOnce(AUTH_RESPONSE)
    expect(await usersRepo().createAuth('ana@eminat.net', 'secret-123')).toEqual(AUTH_CREATED)
    expect(fakes.admin.createUser).toHaveBeenCalledWith(ATTRS)
  })
  it('links by updating the existing row by id; inserts a new one; both report the failure', async () => {
    answer(null, DUPE)
    expect(await usersRepo().linkRow('u-1', ROW)).toEqual(LINK_FAILED)
    expect(fakes.calls).toContainEqual(['update', ROW])
    expect(fakes.calls).toContainEqual(['eq', 'id', 'u-1'])
    answer(INSERTED)
    expect(await usersRepo().insertRow(ROW)).toEqual(INSERTED_RESULT)
    expect(fakes.calls).toContainEqual(['insert', ROW])
  })
  it('answers the role label, or null when the role has no row', async () => {
    answer(ROLE_ROW)
    expect(await usersRepo().roleLabel('mkt')).toBe('Marketing')
    answer(null)
    expect(await usersRepo().roleLabel('ghost')).toBeNull()
  })
  it('deletes an Auth account and answers its error', async () => {
    fakes.admin.deleteUser.mockResolvedValueOnce(DELETE_FAILED)
    expect(await usersRepo().deleteAuth('a-1')).toEqual(DELETE_ERROR)
  })
})

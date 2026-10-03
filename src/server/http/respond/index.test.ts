import { describe, it, expect } from 'vitest'
import respond from './index'
import type { RespondPolicy, Result } from '../types'

const CATALOG = { taken: 'Already taken.', named: (n: string) => `Hi ${n}` }
const POLICY: RespondPolicy = { success: 201, status: { taken: 409, named: 400 }, catalog: CATALOG }
const WITH_DETAIL: Result<never> = {
  ok: false,
  error: 'named',
  message: 'boom',
  extra: { dbErrorCode: '23505' },
}

describe('respond', () => {
  it('a success answers its data with the success status', async () => {
    const res = respond({ ok: true, data: { user: 1, emailWarning: null } }, POLICY)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ user: 1, emailWarning: null })
  })
  it('a failure answers the catalog text with the status of its key', async () => {
    const res = respond({ ok: false, error: 'taken' }, POLICY)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'Already taken.' })
  })
  it('a runtime message wins over the catalog text, and extra keys travel along', async () => {
    const res = respond(WITH_DETAIL, POLICY)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'boom', dbErrorCode: '23505' })
  })
  it('a function entry without a runtime message answers an empty text, never the function', async () => {
    const res = respond({ ok: false, error: 'named' }, POLICY)
    expect(await res.json()).toEqual({ error: '' })
  })
  it('a key the policy does not know is a 500', async () => {
    const res = respond({ ok: false, error: 'nope', message: 'x' }, POLICY)
    expect(res.status).toBe(500)
  })
})

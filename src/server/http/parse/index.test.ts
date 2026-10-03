import { describe, it, expect } from 'vitest'
import parse from './index'
import type { Validate, Validation } from '../types'

const URL = 'http://localhost/api/x'
const VALID_BODY = '{"name":"Ana"}'
const INVALID_BODY = '{}'
const BROKEN_BODY = 'not json'
const ACCEPTED = { ok: true, data: { name: 'Ana' } }
const REJECTED_BODY = { ok: false, error: 'nameMissing' }
const post = (body: string) => {
  const init = { method: 'POST', body }
  return new Request(URL, init)
}
const REJECTED: Validation<never> = { success: false, error: { issues: [{ message: 'nameMissing' }, { message: 'other' }] } }
const nameOnly: Validate<{ name: string }> = (body) => {
  const name = typeof body === 'object' && body !== null && 'name' in body ? body.name : undefined
  const accepted = { success: true, data: { name: String(name) } }
  return typeof name === 'string' ? accepted : REJECTED
}

describe('parse', () => {
  it('a body the contract accepts comes back as data', async () => {
    expect(await parse(post(VALID_BODY), nameOnly)).toEqual(ACCEPTED)
  })
  it('a rejected body answers the first issue message as the error key', async () => {
    expect(await parse(post(INVALID_BODY), nameOnly)).toEqual(REJECTED_BODY)
  })
  it('a body that is not JSON throws, so the handler answers it as unexpected', async () => {
    await expect(parse(post(BROKEN_BODY), nameOnly)).rejects.toThrow()
  })
})

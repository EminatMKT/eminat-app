import { afterEach, describe, expect, it } from 'vitest'
import { salesQaAllowed } from './qa-gate'

const user = '11111111-1111-4111-8111-111111111111'
const auth = '22222222-2222-4222-8222-222222222222'
const other = '33333333-3333-4333-8333-333333333333'

afterEach(() => {
  delete process.env.ANNIE_SALES_QA_ENABLED
  delete process.env.ANNIE_SALES_QA_ALLOWLIST_JSON
})

describe('Production Sales QA gate', () => {
  it('defaults off even when an ID pair is configured', () => {
    process.env.ANNIE_SALES_QA_ALLOWLIST_JSON = JSON.stringify([{ lillyUsuarioId: user, supabaseAuthId: auth }])
    expect(salesQaAllowed(user, auth)).toBe(false)
  })
  it('requires the exact LILLY user and Auth ID pair, without an admin bypass', () => {
    process.env.ANNIE_SALES_QA_ENABLED = 'true'
    process.env.ANNIE_SALES_QA_ALLOWLIST_JSON = JSON.stringify([{ lillyUsuarioId: user, supabaseAuthId: auth }])
    expect(salesQaAllowed(user, auth)).toBe(true)
    expect(salesQaAllowed(user, other)).toBe(false)
    expect(salesQaAllowed(other, auth)).toBe(false)
  })
  it('fails closed on malformed allowlist data', () => {
    process.env.ANNIE_SALES_QA_ENABLED = 'true'
    process.env.ANNIE_SALES_QA_ALLOWLIST_JSON = '[{"lillyUsuarioId":"bad"}]'
    expect(salesQaAllowed(user, auth)).toBe(false)
  })
})

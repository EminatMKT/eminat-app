import { describe, expect, it, vi } from 'vitest'
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: vi.fn() }))
import { fetchMetaLeadFields, metaGraphVersion, recoverNativeMetaLeads } from './lead-recovery'
import { sealSocialToken } from './token-vault'

const org = '00000000-0000-4000-8000-000000000001'
const integration = '00000000-0000-4000-8000-000000000002'
const receipt = '00000000-0000-4000-8000-000000000003'
const key = Buffer.alloc(32, 7).toString('base64url')
const job = { receiptId: receipt, organizationId: org, integrationId: integration,
  externalLeadId: 'lead-qa-1', tokenCiphertext: sealSocialToken('test-token', key, org, integration),
  tokenExpiresAt: null }

describe('Meta lead recovery boundary', () => {
  it('requires an explicitly pinned Graph version', () => {
    expect(metaGraphVersion({})).toBeNull()
    expect(metaGraphVersion({ LILLY_META_GRAPH_VERSION: 'v24.0' })).toBe('v24.0')
    expect(metaGraphVersion({ LILLY_META_GRAPH_VERSION: 'https://elsewhere.test' })).toBeNull()
  })

  it('fetches bounded field data with a server token and rejects a mismatched ID', async () => {
    const request = vi.fn(async (url: URL, init: RequestInit) => {
      expect(url.origin).toBe('https://graph.facebook.com')
      expect(init.headers).toEqual({ Authorization: 'Bearer test-token' })
      return Response.json({ id: 'lead-qa-1', field_data: [{ name: 'email', values: ['qa@example.test'] }] })
    })
    await expect(fetchMetaLeadFields('lead-qa-1', 'test-token', 'v24.0', request as unknown as typeof fetch))
      .resolves.toEqual({ email: 'qa@example.test' })
    await expect(fetchMetaLeadFields('../bad', 'test-token', 'v24.0', request as unknown as typeof fetch))
      .rejects.toThrow('META_LEAD_INVALID')
    await expect(fetchMetaLeadFields('other', 'test-token', 'v24.0', request as unknown as typeof fetch))
      .rejects.toThrow('META_LEAD_INVALID')
  })

  it('recovers a leased receipt and records only a sanitized outcome', async () => {
    const rpc = vi.fn(async (name: string) => name === 'native_sales_claim_social_leads'
      ? { data: [job], error: null } : { data: { status: 'PROCESSED' }, error: null })
    const result = await recoverNativeMetaLeads({ db: { rpc } as never,
      env: { LILLY_META_GRAPH_VERSION: 'v24.0', LILLY_SOCIAL_TOKEN_KEY: key },
      fetchFields: vi.fn(async () => ({ email: 'qa@example.test' })) })
    expect(result).toEqual({ processed: 1, recovered: 1, failed: 0, deferred: 0, reason: null })
    expect(rpc).toHaveBeenCalledWith('native_sales_retry_social_lead', {
      p_receipt_id: receipt, p_fields: { email: 'qa@example.test' } })
  })

  it('records a retryable error without exposing provider responses', async () => {
    const rpc = vi.fn(async (name: string) => name === 'native_sales_claim_social_leads'
      ? { data: [job], error: null } : { data: 'RETRY', error: null })
    const result = await recoverNativeMetaLeads({ db: { rpc } as never,
      env: { LILLY_META_GRAPH_VERSION: 'v24.0', LILLY_SOCIAL_TOKEN_KEY: key },
      fetchFields: vi.fn(async () => { throw new Error('META_LEAD_FETCH_FAILED') }) })
    expect(result.failed).toBe(1)
    expect(rpc).toHaveBeenCalledWith('native_sales_fail_social_lead', {
      p_receipt_id: receipt, p_error_code: 'META_LEAD_FETCH_FAILED' })
  })
})

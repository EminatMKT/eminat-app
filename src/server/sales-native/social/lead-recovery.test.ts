import { describe, expect, it, vi } from 'vitest'
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: vi.fn() }))
import { fetchMetaLeadFields, metaGraphVersion, recoverNativeMetaLeads } from './lead-recovery'
import { sealSocialToken } from './token-vault'

const org = '9efab353-46a0-43d1-9901-e3f185dc5d30'
const integration = '00000000-0000-4000-8000-000000000002'
const receipt = '00000000-0000-4000-8000-000000000003'
const key = Buffer.alloc(32, 7).toString('base64url')
const job = { receiptId: receipt, organizationId: org, integrationId: integration,
  externalLeadId: '123456', pageId: '405695562628937', formId: '612660371798285', tokenCiphertext: sealSocialToken('test-token', key, org, integration),
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
      return Response.json({ id: '123456', form_id: '612660371798285', field_data: [{ name: 'email', values: ['qa@example.test'] }] })
    })
    await expect(fetchMetaLeadFields('123456', 'test-token', 'v24.0', request as unknown as typeof fetch))
      .resolves.toEqual({ email: 'qa@example.test', _form_id: '612660371798285' })
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

describe('Graph form verification and minimization', () => {
  it('rejects mismatched form and never forwards sensitive field values', async () => {
    const request = vi.fn(async () => Response.json({ id: '123456', form_id: '999',
      field_data: [{ name: 'email', values: ['qa@example.invalid'] }] }))
    await expect(fetchMetaLeadFields('123456','token','v26.0',request as never)).rejects.toThrow('META_LEAD_INVALID')
    request.mockResolvedValue(Response.json({ id: '123456', form_id: '612660371798285',
      field_data: [{ name: 'email', values: ['qa@example.invalid'] }, { name: 'diagnosis', values: ['SYNTHETIC SENSITIVE'] }] }))
    expect(await fetchMetaLeadFields('123456','token','v26.0',request as never)).toEqual({
      email: 'qa@example.invalid', _form_id: '612660371798285', _fields_blocked: 'true' })
  })
  it('does not fetch a queued receipt belonging to a different organization', async () => {
    const rpc = vi.fn(async (name: string) => name === 'native_sales_claim_social_leads'
      ? { data: [{ ...job, organizationId: '00000000-0000-4000-8000-000000000001' }], error: null }
      : { data: 'RETRY', error: null })
    const fetchFields = vi.fn()
    await recoverNativeMetaLeads({ db: { rpc } as never, fetchFields,
      env: { LILLY_META_GRAPH_VERSION: 'v26.0', LILLY_SOCIAL_TOKEN_KEY: key } })
    expect(fetchFields).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('native_sales_fail_social_lead', { p_receipt_id: receipt, p_error_code: 'META_LEAD_INVALID' })
  })
})

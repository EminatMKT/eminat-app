import { describe, expect, it, vi } from 'vitest'
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: vi.fn() }))
import { fetchMetaLeadFields, metaGraphVersion, recoverNativeMetaLeads } from './lead-recovery'

const key = Buffer.alloc(32, 7).toString('base64url')
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

  it('does not claim jobs, fetch data or retry while Phase 1 is active', async () => {
    const rpc = vi.fn()
    const fetchFields = vi.fn()
    const result = await recoverNativeMetaLeads({ db: { rpc } as never,
      env: { LILLY_META_GRAPH_VERSION: 'v24.0', LILLY_SOCIAL_TOKEN_KEY: key }, fetchFields })
    expect(result.reason).toBe('META_INGESTION_DISABLED')
    expect(result.processed).toBe(0)
    expect(rpc).not.toHaveBeenCalled()
    expect(fetchFields).not.toHaveBeenCalled()
  })
})

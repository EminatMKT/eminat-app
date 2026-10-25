import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { nativeGet } = vi.hoisted(() => ({ nativeGet: vi.fn() }))
vi.mock('@/app/api/sales-native/access/route', () => ({ GET: nativeGet }))
import { GET } from './route'

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllEnvs())

describe('Sales access after legacy bridge retirement', () => {
  it('delegates to unchanged native authorization even when every legacy flag is absent', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
    vi.stubEnv('LILLY_NATIVE_SALES_PRIMARY', 'true')
    vi.stubEnv('ANNIE_SALES_QA_ENABLED', undefined)
    const request = new Request('https://lilly.example/api/sales/access')
    const response = Response.json({ allowed: false }, { status: 403 })
    nativeGet.mockResolvedValueOnce(response)
    expect(await GET(request)).toBe(response)
    expect(nativeGet).toHaveBeenCalledWith(request)
  })

  it('fails closed instead of falling back to ANNIE when native Sales is not primary', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
    vi.stubEnv('LILLY_NATIVE_SALES_PRIMARY', 'false')
    vi.stubEnv('ANNIE_SALES_QA_ENABLED', 'true')
    const response = await GET(new Request('https://lilly.example/api/sales/access'))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ allowed: false })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(nativeGet).not.toHaveBeenCalled()
  })
})

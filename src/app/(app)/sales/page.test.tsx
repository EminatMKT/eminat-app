import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  redirect: vi.fn(() => { throw new Error('NATIVE_SALES_REDIRECT') }),
}))

import { notFound, redirect } from 'next/navigation'
import SalesPage from './page'

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('Sales primary cutover', () => {
  it('routes /sales into native Sales without the retired QA gate', async () => {
    vi.stubEnv('ANNIE_SALES_QA_ENABLED', undefined)
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
    vi.stubEnv('LILLY_NATIVE_SALES_PRIMARY', 'true')
    await expect(SalesPage()).rejects.toThrow('NATIVE_SALES_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/sales-native')
  })

  it('returns not found instead of reviving the legacy bridge when native Sales is disabled', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'false')
    vi.stubEnv('ANNIE_SALES_QA_ENABLED', 'true')
    await SalesPage()
    expect(notFound).toHaveBeenCalledOnce()
    expect(redirect).not.toHaveBeenCalled()
  })
})

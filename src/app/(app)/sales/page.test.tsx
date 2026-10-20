import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  redirect: vi.fn(() => { throw new Error('NATIVE_SALES_REDIRECT') }),
}))

import { redirect } from 'next/navigation'
import SalesPage from './page'

afterEach(() => vi.unstubAllEnvs())

describe('Sales primary cutover', () => {
  it('routes /sales into native Sales before loading legacy integration code', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
    vi.stubEnv('LILLY_NATIVE_SALES_PRIMARY', 'true')
    await expect(SalesPage()).rejects.toThrow('NATIVE_SALES_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/sales-native')
  })
})

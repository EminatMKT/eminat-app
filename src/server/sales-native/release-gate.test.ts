import { afterEach, describe, expect, it, vi } from 'vitest'
import { nativeSalesEnabled, nativeSalesPrimary } from './release-gate'

afterEach(() => vi.unstubAllEnvs())

describe('native Sales cutover gates', () => {
  it('keeps both the preview and primary route disabled by default', () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', '')
    vi.stubEnv('LILLY_NATIVE_SALES_PRIMARY', '')
    expect(nativeSalesEnabled()).toBe(false)
    expect(nativeSalesPrimary()).toBe(false)
  })
  it('never promotes /sales from the preview flag alone', () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
    vi.stubEnv('LILLY_NATIVE_SALES_PRIMARY', '')
    expect(nativeSalesEnabled()).toBe(true)
    expect(nativeSalesPrimary()).toBe(false)
  })
  it('requires both exact flags for cutover', () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', '')
    vi.stubEnv('LILLY_NATIVE_SALES_PRIMARY', 'true')
    expect(nativeSalesPrimary()).toBe(false)
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
    expect(nativeSalesPrimary()).toBe(true)
  })
})

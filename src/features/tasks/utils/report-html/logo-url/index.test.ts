import { describe, it, expect } from 'vitest'
import logoUrl from '.'

const PRODUCTION_ORIGIN = 'https://app.stratixsolutions.us'
const LOCAL_ORIGIN = 'http://localhost:3000'
const EXPECTED_PRODUCTION_LOGO_URL = `${PRODUCTION_ORIGIN}/brand/stratix-communications.svg`
const EXPECTED_LOCAL_LOGO_URL = `${LOCAL_ORIGIN}/brand/stratix-communications.svg`

describe('logoUrl', () => {
  it('builds the exact logo asset path under the given origin', () => {
    expect(logoUrl(PRODUCTION_ORIGIN)).toBe(EXPECTED_PRODUCTION_LOGO_URL)
  })

  it('returns an absolute URL: it starts with the given origin', () => {
    expect(logoUrl(PRODUCTION_ORIGIN).startsWith(PRODUCTION_ORIGIN)).toBe(true)
  })

  it('is derived from the origin argument, not hardcoded to one host', () => {
    expect(logoUrl(LOCAL_ORIGIN)).toBe(EXPECTED_LOCAL_LOGO_URL)
    expect(logoUrl(LOCAL_ORIGIN)).not.toBe(logoUrl(PRODUCTION_ORIGIN))
  })
})

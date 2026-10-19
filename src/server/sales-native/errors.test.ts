import { describe, expect, it } from 'vitest'
import { nativeSalesDatabaseError } from './errors'

describe('native Sales database errors', () => {
  it('preserves only known public codes', async () => {
    const known = nativeSalesDatabaseError({ code: '42501', message: 'SALES_ACCESS_DENIED' })
    expect(known.status).toBe(403)
    expect(await known.json()).toEqual({ code: 'SALES_ACCESS_DENIED' })
  })

  it('sanitizes unexpected SQL and upstream details', async () => {
    const unexpected = nativeSalesDatabaseError({ code: 'XX000', message: 'internal SQL: token=secret' })
    expect(unexpected.status).toBe(503)
    expect(await unexpected.json()).toEqual({ code: 'SALES_UNAVAILABLE' })
  })
})

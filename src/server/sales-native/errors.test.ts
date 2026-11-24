import { describe, expect, it } from 'vitest'
import { nativeSalesDatabaseError } from './errors'

describe('native Sales database errors', () => {
  it('preserves only known public codes', async () => {
    const known = nativeSalesDatabaseError({ code: '42501', message: 'SALES_ACCESS_DENIED' })
    expect(known.status).toBe(403)
    expect(await known.json()).toEqual({ code: 'SALES_ACCESS_DENIED' })
  })

  it('maps the expected finance verification state conflict without generalizing SQLSTATE', async () => {
    const conflict = nativeSalesDatabaseError({ code: '22023', message: 'PATIENT_QBO_STATE_CONFLICT' })
    expect(conflict.status).toBe(409)
    expect(conflict.headers.get('Cache-Control')).toBe('no-store')
    expect(await conflict.json()).toEqual({ code: 'PATIENT_QBO_STATE_CONFLICT' })
    const unknown = nativeSalesDatabaseError({ code: '22023', message: 'internal payment state details' })
    expect(unknown.status).toBe(503)
    expect(await unknown.json()).toEqual({ code: 'SALES_UNAVAILABLE' })
  })

  it('sanitizes unexpected SQL and upstream details', async () => {
    const unexpected = nativeSalesDatabaseError({ code: 'XX000', message: 'internal SQL: token=secret' })
    expect(unexpected.status).toBe(503)
    expect(await unexpected.json()).toEqual({ code: 'SALES_UNAVAILABLE' })
  })
})

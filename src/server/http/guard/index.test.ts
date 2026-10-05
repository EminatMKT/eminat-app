import { describe, it, expect } from 'vitest'
import guard from './index'
import type { Access } from '@/shared/db/types'

const DENIED: Access = { ok: false, status: 403, error: 'Admin only.' }
const ALLOWED: Access = { ok: true, userId: 'u-1' }

describe('guard', () => {
  it('a denied check answers its own status and error', async () => {
    const res = await guard(async () => DENIED)
    expect(res?.status).toBe(403)
    expect(await res?.json()).toEqual({ error: 'Admin only.' })
  })
  it('an allowed check lets the handler go on', async () => {
    expect(await guard(async () => ALLOWED)).toBeNull()
  })
})

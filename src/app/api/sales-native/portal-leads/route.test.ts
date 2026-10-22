import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  calls: [] as { name: string; params: Record<string, unknown> }[],
}))
vi.mock('@/server/sales-native/auth', () => ({
  resolveSalesActor: async () => ({ organizationId: 'org-scoped', memberId: 'actor-scoped' }),
  nativeSalesErrorResponse: () => Response.json({ code: 'DENIED' }, { status: 403 }),
}))
vi.mock('@/shared/db/supabaseAdmin', () => ({
  supabaseAdmin: () => ({
    rpc: async (name: string, params: Record<string, unknown>) => {
      state.calls.push({ name, params })
      return { data: [], error: null }
    },
  }),
}))

import { GET } from './route'

describe('Portal leads Sales read endpoint', () => {
  beforeEach(() => { state.calls.length = 0 })

  it('passes the authenticated organization and member to the scoped database function', async () => {
    const response = await GET(new Request('https://app.test/api/sales-native/portal-leads?plan=ESSENTIAL&followUp=true'))
    expect(response.status).toBe(200)
    expect(state.calls).toHaveLength(1)
    expect(state.calls[0].name).toBe('native_sales_portal_leads')
    expect(state.calls[0].params).toMatchObject({
      p_organization_id: 'org-scoped',p_actor_member_id: 'actor-scoped',
      p_plan: 'ESSENTIAL',p_follow_up: true,
    })
  })

  it('rejects arbitrary filters before querying patient Sales records', async () => {
    const response = await GET(new Request('https://app.test/api/sales-native/portal-leads?organizationId=other'))
    expect(response.status).toBe(400)
    expect(state.calls).toHaveLength(0)
  })
})

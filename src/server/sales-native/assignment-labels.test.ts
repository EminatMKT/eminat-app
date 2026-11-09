import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  organization: '',
  requestedMemberIds: [] as string[],
  requestedUserIds: [] as string[],
}))
vi.mock('@/shared/db/supabaseAdmin', () => ({
  supabaseAdmin: () => ({ from: (table: string) => ({
    select: () => ({
      eq: (_column: string, value: string) => ({ in: async (_field: string, ids: string[]) => {
        state.organization = value
        state.requestedMemberIds = ids
        expect(table).toBe('sales_members')
        return { data: [
          { id: 'gigi', user_id: 'user-gigi', display_name: null, role: 'SELLER', status: 'active' },
          { id: 'fallback', user_id: 'user-admin', display_name: null, role: 'SUPERADMIN', status: 'pending' },
        ], error: null }
      } }),
      in: async (_field: string, ids: string[]) => {
        state.requestedUserIds = ids
        expect(table).toBe('usuarios')
        return { data: [
          { id: 'user-gigi', nombre_display: 'Gigi Seller' },
          { id: 'user-admin', nombre_display: 'Administrative fallback' },
        ], error: null }
      },
    }),
  }) }),
}))

import { withAssignmentLabels } from './assignment-labels'

describe('Sales assignment labels', () => {
  beforeEach(() => { state.organization = ''; state.requestedMemberIds = []; state.requestedUserIds = [] })

  it('uses the canonical owner in visible rows without expanding the Sales directory', async () => {
    const rows = await withAssignmentLabels('emc-org', [
      { id: 'assigned-lead', owner_member_id: 'gigi' },
      { id: 'unassigned-portal-lead', ownerMemberId: 'fallback' },
    ])
    expect(state.organization).toBe('emc-org')
    expect(state.requestedMemberIds).toEqual(['gigi', 'fallback'])
    expect(state.requestedUserIds).toEqual(['user-gigi'])
    expect(rows[0]).toMatchObject({ ownerDisplayName: 'Gigi Seller',
      assignedSellerName: 'Gigi Seller', sellerAssignmentStatus: 'ASSIGNED' })
    expect(rows[1]).toMatchObject({ ownerDisplayName: null,
      assignedSellerName: null, sellerAssignmentStatus: 'NEEDS_ASSIGNMENT' })
  })

  it('does not query staff when no visible record has an owner', async () => {
    expect(await withAssignmentLabels('emc-org', [{ id: 'empty' }])).toMatchObject([
      { assignedSellerName: null, sellerAssignmentStatus: 'NEEDS_ASSIGNMENT' },
    ])
    expect(state.organization).toBe('')
  })
})

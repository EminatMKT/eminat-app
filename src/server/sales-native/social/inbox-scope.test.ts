import { describe, expect, it } from 'vitest'
import type { SalesActor } from '../policy'
import { visibleSocialAssets, visibleSocialConversations } from './inbox-scope'

const seller: SalesActor = { organizationId: 'qa-org', memberId: 'seller-a', userId: 'user-a',
  role: 'SELLER', teamIds: ['team-a'] }
const assets = [
  { id: 'own', default_owner_member_id: 'seller-a', default_team_id: 'team-a' },
  { id: 'other-team', default_owner_member_id: 'seller-b', default_team_id: 'team-b' },
  { id: 'same-team', default_owner_member_id: 'seller-b', default_team_id: 'team-a' },
]
const conversations = [
  { id: 'own-thread', asset_id: 'own', owner_member_id: 'seller-a' },
  { id: 'other-owner-on-own-asset', asset_id: 'own', owner_member_id: 'seller-b' },
  { id: 'other-team-thread', asset_id: 'other-team', owner_member_id: 'seller-b' },
  { id: 'same-team-thread', asset_id: 'same-team', owner_member_id: 'seller-b' },
]

describe('Social inbox Sales scope', () => {
  it('limits a Seller to their asset and assigned conversation', () => {
    const allowedAssets = visibleSocialAssets(seller, assets)
    expect(allowedAssets.map(row => row.id)).toEqual(['own'])
    expect(visibleSocialConversations(seller, allowedAssets, conversations).map(row => row.id))
      .toEqual(['own-thread'])
  })
  it('lets a Sales Manager read team assets and conversations but never another team', () => {
    const manager = { ...seller, role: 'SALES_MANAGER' as const }
    const allowedAssets = visibleSocialAssets(manager, assets)
    expect(allowedAssets.map(row => row.id)).toEqual(['own', 'same-team'])
    expect(visibleSocialConversations(manager, allowedAssets, conversations).map(row => row.id))
      .toEqual(['own-thread', 'other-owner-on-own-asset', 'same-team-thread'])
  })
})

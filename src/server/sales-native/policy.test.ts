import { describe, expect, it } from 'vitest'
import { canReadSalesRecord, canReassignSalesRecord, canWriteSalesRecord, salesCan, type SalesActor } from './policy'

const seller: SalesActor = { organizationId: 'org-a', memberId: 'seller-a', userId: 'user-a', role: 'SELLER', teamIds: ['team-a'] }
const owned = { id: 'lead-a', organizationId: 'org-a', ownerMemberId: 'seller-a', teamId: 'team-a' }
const peer = { ...owned, id: 'lead-b', ownerMemberId: 'seller-b' }

describe('native Sales authorization', () => {
  it('lets a Seller edit their own record but never reassign it', () => {
    expect(canReadSalesRecord(seller, 'lead', owned)).toBe(true)
    expect(canWriteSalesRecord(seller, 'lead', owned)).toBe(true)
    expect(canReassignSalesRecord(seller, 'lead', owned)).toBe(false)
    expect(salesCan(seller, 'sales:membership:issue')).toBe(true)
  })

  it('denies peer and cross-tenant records before checking grants', () => {
    expect(canReadSalesRecord(seller, 'lead', peer)).toBe(false)
    const granted = { ...seller, recordGrants: [{ entityType: 'lead', recordId: peer.id, canWrite: true }] }
    expect(canWriteSalesRecord(granted, 'lead', peer)).toBe(true)
    expect(canReadSalesRecord(granted, 'lead', { ...peer, organizationId: 'org-b' })).toBe(false)
    expect(canWriteSalesRecord(granted, 'lead', { ...peer, organizationId: 'org-b' })).toBe(false)
  })

  it('limits managers to their team and Finance to finance-facing capabilities', () => {
    const manager: SalesActor = { ...seller, role: 'SALES_MANAGER', memberId: 'manager-a' }
    expect(canReassignSalesRecord(manager, 'lead', peer)).toBe(true)
    expect(canReadSalesRecord(manager, 'lead', { ...peer, teamId: 'team-b' })).toBe(false)
    const finance: SalesActor = { ...seller, role: 'FINANCE' }
    expect(salesCan(finance, 'sales:payments:read')).toBe(true)
    expect(canReadSalesRecord(finance, 'lead', owned)).toBe(false)
    expect(canWriteSalesRecord(finance, 'lead', owned)).toBe(false)
  })
})

/** LILLY-owned Sales policy. Never import ANNIE runtime code into this module. */
export const salesRoles = [
  'SUPERADMIN', 'ADMINISTRATOR', 'SALES_MANAGER', 'SELLER', 'FINANCE', 'AUDITOR',
] as const
export type SalesRole = (typeof salesRoles)[number]

export type SalesPermission =
  | 'sales:read' | 'sales:write' | 'sales:reassign' | 'sales:audit'
  | 'sales:configuration' | 'sales:reports' | 'sales:email'
  | 'sales:payments:read' | 'sales:payments:request' | 'sales:payments:confirm'
  | 'sales:membership:issue' | 'sales:membership:approve-family'
  | 'sales:social:manage'

const rolePermissions: Record<SalesRole, readonly SalesPermission[]> = {
  SELLER: [
    'sales:read', 'sales:write', 'sales:reports', 'sales:email',
    'sales:payments:read', 'sales:payments:request',
  ],
  SALES_MANAGER: [
    'sales:read', 'sales:write', 'sales:reassign', 'sales:reports', 'sales:email',
    'sales:payments:read', 'sales:payments:request', 'sales:membership:issue',
    'sales:membership:approve-family',
  ],
  ADMINISTRATOR: [
    'sales:read', 'sales:write', 'sales:reassign', 'sales:audit',
    'sales:configuration', 'sales:reports', 'sales:email',
    'sales:payments:read', 'sales:payments:request', 'sales:payments:confirm',
    'sales:membership:issue', 'sales:membership:approve-family',
    'sales:social:manage',
  ],
  SUPERADMIN: [
    'sales:read', 'sales:write', 'sales:reassign', 'sales:audit',
    'sales:configuration', 'sales:reports', 'sales:email',
    'sales:payments:read', 'sales:payments:request', 'sales:payments:confirm',
    'sales:membership:issue', 'sales:membership:approve-family',
    'sales:social:manage',
  ],
  FINANCE: ['sales:reports', 'sales:payments:read', 'sales:payments:confirm'],
  AUDITOR: ['sales:read', 'sales:audit', 'sales:reports', 'sales:payments:read'],
}

export type SalesActor = {
  organizationId: string
  memberId: string
  userId: string
  role: SalesRole
  teamIds: readonly string[]
  recordGrants?: readonly { entityType: string; recordId: string; canWrite: boolean }[]
}

export type ScopedSalesRecord = {
  id: string
  organizationId: string
  ownerMemberId: string
  teamId: string | null
}

export function salesCan(actor: SalesActor, permission: SalesPermission): boolean {
  return rolePermissions[actor.role].includes(permission)
}

export function canReadSalesRecord(actor: SalesActor, entityType: string, row: ScopedSalesRecord): boolean {
  if (row.organizationId !== actor.organizationId || !salesCan(actor, 'sales:read')) return false
  if (['SUPERADMIN', 'ADMINISTRATOR', 'AUDITOR'].includes(actor.role)) return true
  if (row.ownerMemberId === actor.memberId) return true
  if (actor.role === 'SALES_MANAGER' && row.teamId && actor.teamIds.includes(row.teamId)) return true
  return !!actor.recordGrants?.some(grant => grant.entityType === entityType && grant.recordId === row.id)
}

export function canWriteSalesRecord(actor: SalesActor, entityType: string, row: ScopedSalesRecord): boolean {
  if (row.organizationId !== actor.organizationId || !salesCan(actor, 'sales:write')) return false
  if (actor.role === 'SUPERADMIN' || actor.role === 'ADMINISTRATOR') return true
  if (row.ownerMemberId === actor.memberId) return true
  if (actor.role === 'SALES_MANAGER' && row.teamId && actor.teamIds.includes(row.teamId)) return true
  return !!actor.recordGrants?.some(grant => grant.entityType === entityType && grant.recordId === row.id && grant.canWrite)
}

/** Reassignment requires its own capability even for a writable record. */
export function canReassignSalesRecord(actor: SalesActor, entityType: string, row: ScopedSalesRecord): boolean {
  return salesCan(actor, 'sales:reassign') && canWriteSalesRecord(actor, entityType, row)
}

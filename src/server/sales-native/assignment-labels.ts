import 'server-only'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

type SalesRow = Record<string, unknown>
type AssignmentLabels = {
  ownerDisplayName: string | null
  assignedSellerName: string | null
  sellerAssignmentStatus: 'ASSIGNED' | 'NEEDS_ASSIGNMENT'
}

const nonEmpty = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
const ownerId = (row: SalesRow) => nonEmpty(row.ownerMemberId) ||
  nonEmpty(row.owner_member_id) || nonEmpty(row.seller_member_id)

/** Resolve names only for member IDs already present in organization-scoped visible rows. */
export async function withAssignmentLabels<T extends SalesRow>(organizationId: string, rows: T[]): Promise<(T & AssignmentLabels)[]> {
  const ids = Array.from(new Set(rows.map(ownerId).filter((id): id is string => Boolean(id))))
  if (!ids.length) return rows.map(row => ({ ...row, ownerDisplayName: null,
    assignedSellerName: null, sellerAssignmentStatus: 'NEEDS_ASSIGNMENT' as const }))

  const admin = supabaseAdmin({ noStore: true })
  const { data: members, error: membersError } = await admin.from('sales_members')
    .select('id,user_id,display_name,role,status')
    .eq('organization_id', organizationId).in('id', ids)
  if (membersError) throw new Error('SALES_ASSIGNMENT_LOOKUP_UNAVAILABLE')

  const userIds = Array.from(new Set((members ?? []).filter(member => member.status === 'active')
    .map(member => member.user_id).filter((id): id is string => Boolean(id))))
  const { data: users, error: usersError } = userIds.length
    ? await admin.from('usuarios').select('id,nombre_display').in('id', userIds)
    : { data: [], error: null }
  if (usersError) throw new Error('SALES_ASSIGNMENT_LOOKUP_UNAVAILABLE')

  const userNames = new Map((users ?? []).map(user => [user.id, nonEmpty(user.nombre_display)]))
  const byMember = new Map((members ?? []).map(member => {
    const displayName = userNames.get(member.user_id) || nonEmpty(member.display_name)
    return [member.id, { displayName, active: member.status === 'active',
      assigned: member.status === 'active' && member.role === 'SELLER' }] as const
  }))
  return rows.map(row => {
    const owner = byMember.get(ownerId(row) || '')
    const assigned = Boolean(owner?.assigned)
    return { ...row, ownerDisplayName: owner?.active && (row.source !== 'Patient Portal' || assigned)
      ? owner.displayName || null : null,
      assignedSellerName: assigned ? owner?.displayName || null : null,
      sellerAssignmentStatus: assigned ? 'ASSIGNED' as const : 'NEEDS_ASSIGNMENT' as const }
  })
}

import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { withAssignmentLabels } from '@/server/sales-native/assignment-labels'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

const filters = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  q: z.string().trim().max(200).optional(),
  owner: z.uuid().optional(),
  assignment: z.enum(['ASSIGNED','NEEDS_ASSIGNMENT']).optional(),
  plan: z.enum(['ESSENTIAL','PLUS','MAX']).optional(),
  type: z.enum(['INDIVIDUAL','FAMILY']).optional(),
  stage: z.enum(['PAYMENT_PENDING','WON','LOST']).optional(),
  invoice: z.enum(['NOT_CREATED','OPEN','PAID','VOID','QA_SYNTHETIC']).optional(),
  payment: z.enum(['UNPAID','REPORTED','PAID','VERIFIED','REJECTED']).optional(),
  membership: z.enum(['NOT_ACTIVE','ACTIVE','PENDING','EXPIRED','CANCELLED']).optional(),
  followUp: z.enum(['true','false']).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
}).strict()

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    const parsed = filters.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return Response.json({ code: 'INVALID_FILTER' }, { status: 400 })
    const value = parsed.data
    if (value.from && value.to && value.from > value.to)
      return Response.json({ code: 'INVALID_FILTER' }, { status: 400 })
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_portal_leads', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_limit: value.limit,
      p_offset: value.offset,
      p_search: value.q || null,
      p_owner: value.owner || null,
      p_assignment: value.assignment || null,
      p_plan: value.plan || null,
      p_type: value.type || null,
      p_stage: value.stage || null,
      p_invoice: value.invoice || null,
      p_payment: value.payment || null,
      p_membership: value.membership || null,
      p_follow_up: value.followUp === undefined ? null : value.followUp === 'true',
      p_registered_from: value.from || null,
      p_registered_to: value.to || null,
    })
    if (error) return nativeSalesDatabaseError(error)
    const visibleRows = await withAssignmentLabels(actor.organizationId, data ?? [])
    return Response.json({ data: visibleRows, nextOffset: visibleRows.length === value.limit
      ? value.offset + value.limit : null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}

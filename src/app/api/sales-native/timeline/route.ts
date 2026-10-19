import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const filter = z.object({
  resource: z.enum(['leads','contacts','accounts','opportunities']),
  id: z.uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
}).strict()

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    const parsed = filter.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return Response.json({ code: 'INVALID_FILTER' }, { status: 400 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_timeline', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_resource: parsed.data.resource,
      p_record_id: parsed.data.id,
      p_limit: parsed.data.limit,
      p_offset: parsed.data.offset,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data: data ?? [], nextOffset: (data?.length ?? 0)===parsed.data.limit
      ? parsed.data.offset+parsed.data.limit : null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}

import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10)===value
})
const filter = z.object({ from: date, to: date }).strict()

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    const parsed = filter.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success || parsed.data.to < parsed.data.from)
      return Response.json({ code: 'INVALID_PERIOD' }, { status: 422 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_report_detail', {
      p_organization_id: actor.organizationId,
      p_actor_member_id: actor.memberId,
      p_from: parsed.data.from,
      p_to: parsed.data.to,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}

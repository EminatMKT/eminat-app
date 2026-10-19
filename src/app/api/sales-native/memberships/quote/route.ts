import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { membershipTypes, plans, saleDurations } from '@/server/sales-native/pricing'
import { salesCan } from '@/server/sales-native/policy'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    if (!salesCan(actor, 'sales:read')) return Response.json({ code: 'SALES_ACCESS_DENIED' }, { status: 403 })
    const params = new URL(request.url).searchParams
    if (Array.from(params.keys()).some(key => !['plan','type','duration'].includes(key)))
      return Response.json({ code: 'INVALID_MEMBERSHIP_QUOTE' }, { status: 422 })
    const plan = params.get('plan')
    const type = params.get('type')
    const duration = params.get('duration')
    if (!plan || !type || !duration || !(plans as readonly string[]).includes(plan) ||
        !(membershipTypes as readonly string[]).includes(type) ||
        !(saleDurations as readonly string[]).includes(duration))
      return Response.json({ code: 'INVALID_MEMBERSHIP_QUOTE' }, { status: 422 })
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_membership_quote', {
      p_plan: plan, p_type: type, p_duration: duration,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data: data?.[0] ?? null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}

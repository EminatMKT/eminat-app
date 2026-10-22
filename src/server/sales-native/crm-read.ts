import 'server-only'
import { nativeSalesDatabaseError } from './errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import type { SalesActor } from './policy'
import { withAssignmentLabels } from './assignment-labels'

export const nativeCrmResources = ['leads', 'contacts', 'accounts', 'opportunities'] as const
export type NativeCrmResource = (typeof nativeCrmResources)[number]
export function isNativeCrmResource(value: string): value is NativeCrmResource {
  return (nativeCrmResources as readonly string[]).includes(value)
}

export async function scopedCrmRead(actor: SalesActor, resource: NativeCrmResource,
  options: { limit?: number; offset?: number; q?: string | null; id?: string | null }): Promise<Response> {
  const limit = options.limit ?? 25
  const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_visible_crm', {
    p_organization_id: actor.organizationId,
    p_actor_member_id: actor.memberId,
    p_resource: resource,
    p_limit: limit,
    p_offset: options.offset ?? 0,
    p_q: options.q ?? null,
    p_id: options.id ?? null,
  })
  if (error) return nativeSalesDatabaseError(error)
  const visibleRows = resource === 'leads' || resource === 'opportunities'
    ? await withAssignmentLabels(actor.organizationId, data ?? []) : data ?? []
  if (options.id) {
    if (!visibleRows.length) return Response.json({ code: 'NOT_FOUND' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    return Response.json({ data: visibleRows[0] }, { headers: { 'Cache-Control': 'no-store' } })
  }
  return Response.json({ data: visibleRows, nextOffset: visibleRows.length === limit ? (options.offset ?? 0) + limit : null },
    { headers: { 'Cache-Control': 'no-store' } })
}

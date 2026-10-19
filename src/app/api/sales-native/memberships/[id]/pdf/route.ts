import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { createMembershipPdf } from '@/server/sales-native/membership-pdf'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const membership = z.object({
  code: z.string().min(1).max(32),first_name: z.string().min(1),last_name: z.string().min(1),
  plan: z.enum(['ESSENTIAL','PLUS','MAX','LEGACY_UNSPECIFIED']),
  membership_type: z.enum(['INDIVIDUAL','FAMILY','LEGACY_UNSPECIFIED']),
  duration: z.enum(['MONTHLY','2M','3M','6M','12M','LEGACY_UNSPECIFIED']),
  issued_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),status: z.string().min(1).max(40),
  effectiveStatus: z.string().min(1).max(40),
})

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const actor = await resolveSalesActor(request)
    if (!z.uuid().safeParse(context.params.id).success)
      return Response.json({ code: 'INVALID_ID' }, { status: 400 })
    const params = new URL(request.url).searchParams
    if (Array.from(params.keys()).some(key => key!=='download') ||
        (params.has('download') && params.get('download')!=='1'))
      return Response.json({ code: 'INVALID_FILTER' }, { status: 400 })
    const { data, error } = await supabaseAdmin().rpc('native_sales_visible_memberships', {
      p_organization_id: actor.organizationId,p_actor_member_id: actor.memberId,
      p_limit: 1,p_offset: 0,p_q: null,p_id: context.params.id,p_demo: null,
    })
    if (error) return nativeSalesDatabaseError(error)
    if (!data?.length) return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
    const parsed = membership.safeParse(data[0])
    if (!parsed.success) return Response.json({ code: 'MEMBERSHIP_UNAVAILABLE' }, { status: 503 })
    const row = parsed.data
    const pdf = await createMembershipPdf({
      code: row.code,firstName: row.first_name,lastName: row.last_name,
      plan: row.plan,membershipType: row.membership_type,duration: row.duration,
      issuedAt: row.issued_at,expiresAt: row.expires_at,status: row.effectiveStatus,
    })
    const file = row.code.replace(/[^A-Za-z0-9_-]/g,'_').slice(0,32) || 'membership'
    return new Response(pdf as BodyInit, { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${params.get('download')==='1' ? 'attachment' : 'inline'}; filename="corazon-salud-${file}.pdf"`,
      'Cache-Control': 'private, no-store', 'Vary': 'Authorization',
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}

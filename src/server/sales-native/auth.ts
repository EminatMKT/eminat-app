import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { salesRoles, type SalesActor, type SalesRole } from './policy'
import { nativeSalesEnabled } from './release-gate'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class NativeSalesAuthError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code) }
}

/** Resolves only a LILLY Supabase identity. ANNIE is never called. */
export async function resolveSalesActor(request: Request): Promise<SalesActor> {
  if (!nativeSalesEnabled()) throw new NativeSalesAuthError(404, 'SALES_NOT_ACTIVE')
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token || token.length > 8192) throw new NativeSalesAuthError(401, 'AUTHENTICATION_REQUIRED')
  const client = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: auth, error: authError } = await client.auth.getUser(token)
  if (authError || !auth.user || !uuid.test(auth.user.id))
    throw new NativeSalesAuthError(401, 'AUTHENTICATION_REQUIRED')

  const admin = supabaseAdmin()
  const { data: profile, error: profileError } = await admin.from('usuarios')
    .select('id').eq('auth_id', auth.user.id).eq('activo', true).maybeSingle()
  if (profileError) throw new NativeSalesAuthError(503, 'SALES_IDENTITY_UNAVAILABLE')
  if (!profile?.id) throw new NativeSalesAuthError(403, 'SALES_ACCESS_DENIED')

  const requestedOrganization = request.headers.get('x-sales-organization-id')
  if (requestedOrganization && !uuid.test(requestedOrganization))
    throw new NativeSalesAuthError(400, 'INVALID_ORGANIZATION_ID')
  let query = admin.from('sales_members')
    .select('id,organization_id,user_id,role')
    .eq('auth_id', auth.user.id).eq('user_id', profile.id).eq('status', 'active')
  if (requestedOrganization) query = query.eq('organization_id', requestedOrganization)
  const { data: memberships, error: membershipError } = await query.limit(2)
  if (membershipError) throw new NativeSalesAuthError(503, 'SALES_IDENTITY_UNAVAILABLE')
  if (!memberships?.length) throw new NativeSalesAuthError(403, 'SALES_ACCESS_DENIED')
  if (memberships.length !== 1) throw new NativeSalesAuthError(409, 'SALES_ORGANIZATION_REQUIRED')
  const membership = memberships[0]
  if (!uuid.test(membership.id) || !uuid.test(membership.organization_id) ||
      !salesRoles.includes(membership.role as SalesRole))
    throw new NativeSalesAuthError(503, 'SALES_IDENTITY_INVALID')

  const { data: organization, error: organizationError } = await admin.from('sales_organizations')
    .select('id').eq('id', membership.organization_id).eq('status', 'active').maybeSingle()
  if (organizationError) throw new NativeSalesAuthError(503, 'SALES_IDENTITY_UNAVAILABLE')
  if (!organization) throw new NativeSalesAuthError(403, 'SALES_ACCESS_DENIED')

  const { data: teamRows, error: teamsError } = await admin.from('sales_team_members')
    .select('team_id').eq('organization_id', membership.organization_id).eq('member_id', membership.id)
  if (teamsError) throw new NativeSalesAuthError(503, 'SALES_IDENTITY_UNAVAILABLE')
  return {
    organizationId: membership.organization_id,
    memberId: membership.id,
    userId: profile.id,
    role: membership.role as SalesRole,
    teamIds: (teamRows ?? []).map(row => row.team_id),
  }
}

export function nativeSalesErrorResponse(error: unknown): Response {
  const known = error instanceof NativeSalesAuthError ? error : new NativeSalesAuthError(503, 'SALES_UNAVAILABLE')
  return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
}

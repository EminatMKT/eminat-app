import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { noStoreFetch } from '@/shared/db/noStoreFetch'
import { salesRoles, type SalesActor, type SalesRole } from './policy'
import { nativeSalesEnabled } from './release-gate'
import { measureSalesStage, type SalesStageObserver } from './performance-audit'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class NativeSalesAuthError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code) }
}

/** Resolve the login independently of any requested Sales organization. */
async function resolveSalesIdentity(request: Request, observe?: SalesStageObserver) {
  if (!nativeSalesEnabled()) throw new NativeSalesAuthError(404, 'SALES_NOT_ACTIVE')
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token || token.length > 8192) throw new NativeSalesAuthError(401, 'AUTHENTICATION_REQUIRED')
  const client = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: noStoreFetch },
  })
  const { data: auth, error: authError } = await measureSalesStage(observe, 'supabase_auth', () => client.auth.getUser(token))
  if (authError || !auth.user || !uuid.test(auth.user.id))
    throw new NativeSalesAuthError(401, 'AUTHENTICATION_REQUIRED')

  const admin = supabaseAdmin({ noStore: true })
  const { data: profile, error: profileError } = await measureSalesStage(observe, 'profile', () => admin.from('usuarios')
    .select('id').eq('auth_id', auth.user.id).eq('activo', true).maybeSingle())
  if (profileError) throw new NativeSalesAuthError(503, 'SALES_IDENTITY_UNAVAILABLE')
  if (!profile?.id) throw new NativeSalesAuthError(403, 'SALES_ACCESS_DENIED')

  return { admin, authId: auth.user.id, userId: profile.id }
}

export type SalesOrganizationOption = {
  organizationId: string
  name: string
  code: string
  role: SalesRole
}

/** Discovery never grants record access. Every data request still resolves its actor. */
export async function readSalesOrganizations(
  admin: ReturnType<typeof supabaseAdmin>, authId: string, userId: string,
): Promise<SalesOrganizationOption[]> {
  const { data, error } = await admin.from('sales_members')
    .select('organization_id,role,sales_organizations!inner(id,name,code,status)')
    .eq('auth_id', authId).eq('user_id', userId).eq('status', 'active')
    .eq('sales_organizations.status', 'active').limit(101)
  if (error || (data?.length ?? 0) > 100)
    throw new NativeSalesAuthError(503, 'SALES_IDENTITY_UNAVAILABLE')
  const options: SalesOrganizationOption[] = []
  for (const row of data ?? []) {
    const relation = row.sales_organizations
    const organization = Array.isArray(relation) ? relation.length === 1 ? relation[0] : null : relation
    if (!organization || !uuid.test(row.organization_id) ||
        organization.id !== row.organization_id || organization.status !== 'active' ||
        !organization.name || !organization.code || !salesRoles.includes(row.role as SalesRole))
      throw new NativeSalesAuthError(503, 'SALES_IDENTITY_INVALID')
    options.push({ organizationId: row.organization_id, name: organization.name,
      code: organization.code, role: row.role as SalesRole })
  }
  return options.sort((a,b) => a.name.localeCompare(b.name))
}

export async function resolveSalesOrganizations(request: Request, observe?: SalesStageObserver) {
  const { admin, authId, userId } = await resolveSalesIdentity(request, observe)
  const options = await readSalesOrganizations(admin, authId, userId)
  if (!options.length) throw new NativeSalesAuthError(403, 'SALES_ACCESS_DENIED')
  return options
}

/** Resolves only a LILLY Supabase identity. ANNIE is never called. */
export async function resolveSalesActor(request: Request, observe?: SalesStageObserver): Promise<SalesActor> {
  const { admin, authId, userId } = await resolveSalesIdentity(request, observe)

  const requestedOrganization = request.headers.get('x-sales-organization-id')
  if (requestedOrganization && !uuid.test(requestedOrganization))
    throw new NativeSalesAuthError(400, 'INVALID_ORGANIZATION_ID')
  let query = admin.from('sales_members')
    .select('id,organization_id,user_id,role')
    .eq('auth_id', authId).eq('user_id', userId).eq('status', 'active')
  if (requestedOrganization) query = query.eq('organization_id', requestedOrganization)
  const { data: memberships, error: membershipError } = await measureSalesStage(observe, 'membership', () => query.limit(2))
  if (membershipError) throw new NativeSalesAuthError(503, 'SALES_IDENTITY_UNAVAILABLE')
  if (!memberships?.length) throw new NativeSalesAuthError(403, 'SALES_ACCESS_DENIED')
  if (memberships.length !== 1) throw new NativeSalesAuthError(409, 'SALES_ORGANIZATION_REQUIRED')
  const membership = memberships[0]
  if (!uuid.test(membership.id) || !uuid.test(membership.organization_id) ||
      !salesRoles.includes(membership.role as SalesRole))
    throw new NativeSalesAuthError(503, 'SALES_IDENTITY_INVALID')

  const { data: organization, error: organizationError } = await measureSalesStage(observe, 'organization', () => admin.from('sales_organizations')
    .select('id').eq('id', membership.organization_id).eq('status', 'active').maybeSingle())
  if (organizationError) throw new NativeSalesAuthError(503, 'SALES_IDENTITY_UNAVAILABLE')
  if (!organization) throw new NativeSalesAuthError(403, 'SALES_ACCESS_DENIED')

  const { data: teamRows, error: teamsError } = await measureSalesStage(observe, 'teams', () => admin.from('sales_team_members')
    .select('team_id').eq('organization_id', membership.organization_id).eq('member_id', membership.id))
  if (teamsError) throw new NativeSalesAuthError(503, 'SALES_IDENTITY_UNAVAILABLE')
  return {
    organizationId: membership.organization_id,
    memberId: membership.id,
    userId,
    role: membership.role as SalesRole,
    teamIds: (teamRows ?? []).map(row => row.team_id),
  }
}

export function nativeSalesErrorResponse(error: unknown): Response {
  const known = error instanceof NativeSalesAuthError ? error : new NativeSalesAuthError(503, 'SALES_UNAVAILABLE')
  return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
}

import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { noStoreFetch } from '@/shared/db/noStoreFetch'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { resolveSalesActor } from '@/server/sales-native/auth'

const EMC = '9efab353-46a0-43d1-9901-e3f185dc5d30'
const FREDDY_MEMBER = 'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad'
const FREDDY_USER = '2344e112-76ef-42a8-ac56-7c488084e0f5'

export async function patientQboActor(request: Request) {
  const requestedOrganization = request.headers.get('x-sales-organization-id')
  if (requestedOrganization && requestedOrganization !== EMC) return null
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token || token.length > 8192) return null
  const client = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: noStoreFetch } })
  const { data: auth, error } = await client.auth.getUser(token)
  if (error || !auth.user) return null
  const admin = supabaseAdmin({ noStore: true })
  const { data: profile, error: profileError } = await admin.from('usuarios')
    .select('id').eq('auth_id',auth.user.id).eq('activo',true).maybeSingle()
  if (profileError || !profile) return null
  // Preserve only the exact owner-approved pending compatibility identity.
  // Active EMC SUPERADMIN access uses the normal membership resolver below.
  if (profile.id === FREDDY_USER) {
    const { data: fallback, error: fallbackError } = await admin.from('sales_members')
      .select('id').eq('id',FREDDY_MEMBER).eq('organization_id',EMC)
      .eq('user_id',profile.id).eq('auth_id',auth.user.id)
      .eq('status','pending').eq('role','SUPERADMIN')
      .eq('evidence_ref','owner-approved-emc-patient-fallback-2026-10-20').maybeSingle()
    if (!fallbackError && fallback) return { memberId: FREDDY_MEMBER, verifier: true }
  }
  try {
    const sales = await resolveSalesActor(request)
    if (sales.organizationId !== EMC || !['SELLER','SALES_MANAGER','FINANCE','SUPERADMIN'].includes(sales.role)) return null
    return { memberId: sales.memberId, verifier: ['FINANCE','SUPERADMIN'].includes(sales.role) }
  } catch { return null }
}

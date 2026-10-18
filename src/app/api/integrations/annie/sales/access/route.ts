import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { accountWriteMode, contactWriteMode, leadWriteMode,
  opportunityWriteMode, salesAccessDetails } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return Response.json({ allowed: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  const client = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: auth, error } = await client.auth.getUser(token)
  if (error || !auth.user) return Response.json({ allowed: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  const { data: profile, error: profileError } = await client.from('usuarios')
    .select('id').eq('auth_id', auth.user.id).eq('activo', true).maybeSingle()
  const access = !profileError && !!profile?.id ? await salesAccessDetails(request) :
    { allowed: false, canWrite: false, canReassign: false, canReadAudit: false }
  const write = access.allowed && access.canWrite
  const leadMode = write ? leadWriteMode() : 'disabled'
  const contactMode = write ? contactWriteMode() : 'disabled'
  const accountMode = write ? accountWriteMode() : 'disabled'
  const opportunityMode = write ? opportunityWriteMode() : 'disabled'
  return Response.json({ ...access,
    writeEnabled: leadMode !== 'disabled',
    leadWriteMode: leadMode,
    contactWriteEnabled: contactMode !== 'disabled', contactWriteMode: contactMode,
    accountWriteEnabled: accountMode !== 'disabled', accountWriteMode: accountMode,
    opportunityWriteEnabled: opportunityMode !== 'disabled', opportunityWriteMode: opportunityMode,
    importEnabled: write && process.env.ANNIE_SALES_IMPORT_ENABLED === 'true',
    interactionEnabled: write && process.env.ANNIE_SALES_QA_INTERACTION_ENABLED === 'true',
    emailEnabled: write && process.env.ANNIE_SALES_QA_EMAIL_ENABLED === 'true',
    activityEnabled: write && process.env.ANNIE_SALES_QA_ACTIVITY_ENABLED === 'true',
    membershipQaEnabled: write && access.role === 'SUPERADMIN' &&
      process.env.ANNIE_SALES_QA_MEMBERSHIP_ENABLED === 'true' },
    { headers: { 'Cache-Control': 'no-store' } })
}

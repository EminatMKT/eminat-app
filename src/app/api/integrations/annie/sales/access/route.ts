import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { leadWriteMode, salesAccessDetails } from '@/server/integrations/annie/sales'

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
  return Response.json({ ...access,
    writeEnabled: leadMode !== 'disabled',
    leadWriteMode: leadMode,
    contactWriteEnabled: write && process.env.ANNIE_SALES_QA_CONTACT_WRITE_ENABLED === 'true',
    accountWriteEnabled: write && process.env.ANNIE_SALES_QA_ACCOUNT_WRITE_ENABLED === 'true',
    opportunityWriteEnabled: write && process.env.ANNIE_SALES_QA_OPPORTUNITY_WRITE_ENABLED === 'true',
    importEnabled: write && process.env.ANNIE_SALES_IMPORT_ENABLED === 'true',
    interactionEnabled: write && process.env.ANNIE_SALES_QA_INTERACTION_ENABLED === 'true',
    emailEnabled: write && process.env.ANNIE_SALES_QA_EMAIL_ENABLED === 'true',
    activityEnabled: write && process.env.ANNIE_SALES_QA_ACTIVITY_ENABLED === 'true' },
    { headers: { 'Cache-Control': 'no-store' } })
}

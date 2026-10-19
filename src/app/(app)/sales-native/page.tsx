import { notFound } from 'next/navigation'
import NativeSalesModule from '@/features/native-sales/NativeSalesModule'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

/** Isolated review route. Existing /sales stays on its verified release path. */
export default async function NativeSalesPreviewPage() {
  const client = ssrClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) notFound()
  const admin = supabaseAdmin()
  const { data: profile, error: profileError } = await admin.from('usuarios')
    .select('id').eq('auth_id', user.id).eq('activo', true).maybeSingle()
  if (profileError || !profile?.id) notFound()
  const { data: memberships, error } = await admin.from('sales_members')
    .select('organization_id,sales_organizations!inner(status)')
    .eq('auth_id', user.id).eq('user_id', profile.id).eq('status', 'active')
    .eq('sales_organizations.status', 'active').limit(2)
  if (error || memberships?.length !== 1) notFound()
  return <NativeSalesModule organizationId={memberships[0].organization_id} />
}

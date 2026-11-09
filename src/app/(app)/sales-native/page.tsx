import { notFound } from 'next/navigation'
import NativeSalesModule from '@/features/native-sales/NativeSalesModule'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import { readSalesOrganizations } from '@/server/sales-native/auth'
import { authorizedCommercialWorkspaces } from '@/features/native-sales/commercial-workspaces'

export const dynamic = 'force-dynamic'

export default async function NativeSalesPreviewPage({ searchParams = {} }: {
  searchParams?: { organization?: string | string[] }
} = {}) {
  if (!nativeSalesEnabled()) notFound()
  const client = ssrClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) notFound()
  const admin = supabaseAdmin({ noStore: true })
  const { data: profile, error: profileError } = await admin.from('usuarios')
    .select('id').eq('auth_id', user.id).eq('activo', true).maybeSingle()
  if (profileError || !profile?.id) notFound()
  const organizations = await readSalesOrganizations(admin, user.id, profile.id)
  const workspaces = authorizedCommercialWorkspaces(organizations)
  const requested = searchParams.organization
  const selected = requested === undefined ? workspaces[0]
    : workspaces.find(workspace => workspace.organizationId === requested)
  if (!selected) notFound()
  return <NativeSalesModule key={selected.organizationId} organizationId={selected.organizationId}
    workspaceLabelKey={selected.labelKey} />
}

import { notFound } from 'next/navigation'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { readSalesOrganizations } from '@/server/sales-native/auth'
import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import MetaConnectionsWorkspace from '@/features/native-sales/MetaConnectionsWorkspace'
export const dynamic = 'force-dynamic'
export default async function MetaConnectionsPage({ searchParams = {} }: {
  searchParams?: { organization?: string | string[]; company?: string | string[] }
}) {
  if (!nativeSalesEnabled()) notFound()
  const { data: { user } } = await ssrClient().auth.getUser()
  if (!user) notFound()
  const admin = supabaseAdmin({ noStore: true })
  const { data: profile } = await admin.from('usuarios').select('id').eq('auth_id',user.id).eq('activo',true).maybeSingle()
  if (!profile) notFound()
  const organizations = await readSalesOrganizations(admin,user.id,profile.id)
  const selected = typeof searchParams.organization === 'string'
    ? organizations.find(org => org.organizationId === searchParams.organization) : undefined
  if (searchParams.organization && !selected) notFound()
  return <MetaConnectionsWorkspace organizations={organizations.map(({ organizationId,name }) => ({ organizationId,name }))}
    organizationId={selected?.organizationId} company={typeof searchParams.company === 'string' ? searchParams.company : undefined} />
}

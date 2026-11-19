import 'server-only'
import { notFound } from 'next/navigation'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { readSalesOrganizations } from '@/server/sales-native/auth'
import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import MetaConnectionsWorkspace from './MetaConnectionsWorkspace'
import MetaSettingsLanding from './MetaSettingsLanding'
import {metaAdministrationOrganizations} from './meta-navigation'
export default async function MetaWorkspacePage({ searchParams = {}, view, central=false }: {
  view?:'settings'|'integrations'; central?:boolean;
  searchParams?: { organization?: string | string[]; company?: string | string[] }
}) {
  if (!nativeSalesEnabled()) notFound()
  const { data: { user } } = await ssrClient().auth.getUser()
  if (!user) notFound()
  const admin = supabaseAdmin({ noStore: true })
  const { data: profile } = await admin.from('usuarios').select('id').eq('auth_id',user.id).eq('activo',true).maybeSingle()
  if (!profile) notFound()
  const organizations = metaAdministrationOrganizations(await readSalesOrganizations(admin,user.id,profile.id))
  if (!organizations.length) notFound()
  const selected = typeof searchParams.organization === 'string'
    ? organizations.find(org => org.organizationId === searchParams.organization) : undefined
  if (searchParams.organization && !selected) notFound()
  if(view)return <MetaSettingsLanding view={view} organization={selected?.organizationId} company={typeof searchParams.company === 'string' ? searchParams.company : undefined} />
  return <MetaConnectionsWorkspace central={central} organizations={organizations.map(({ organizationId,name }) => ({ organizationId,name }))}
    organizationId={selected?.organizationId} company={typeof searchParams.company === 'string' ? searchParams.company : undefined} />
}

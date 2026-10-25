import { notFound } from 'next/navigation'
import NativeSalesModule from '@/features/native-sales/NativeSalesModule'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import { readSalesOrganizations } from '@/server/sales-native/auth'
import NativeSalesOrganizationContext from '@/features/native-sales/NativeSalesOrganizationContext'

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
  if (!organizations.length) notFound()
  const requested = searchParams.organization
  const selected = requested === undefined && organizations.length === 1
    ? organizations[0] : organizations.find(option => option.organizationId === requested)
  if (requested !== undefined && !selected) notFound()
  return <NativeSalesOrganizationContext organizations={organizations}
    selectedId={selected?.organizationId}>
    {selected ? <NativeSalesModule key={selected.organizationId} organizationId={selected.organizationId} /> : null}
  </NativeSalesOrganizationContext>
}

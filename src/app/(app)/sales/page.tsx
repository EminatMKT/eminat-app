import { notFound, redirect } from 'next/navigation'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import { nativeSalesPrimary } from '@/server/sales-native/release-gate'

export const dynamic = 'force-dynamic'

export default async function SalesPage() {
  if (nativeSalesPrimary()) redirect('/sales-native')
  // Keep legacy imports behind the cutover decision: native /sales never
  // loads the ANNIE adapter or its UI bundle.
  const [{ default: SalesModule }, { salesQaAllowed }] = await Promise.all([
    import('@/features/annie-sales/SalesModule'),
    import('@/server/integrations/annie/qa-gate'),
  ])
  const client = ssrClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) notFound()
  const { data: profile, error } = await client.from('usuarios')
    .select('id').eq('auth_id', user.id).eq('activo', true).maybeSingle()
  if (error || !profile?.id || !salesQaAllowed(profile.id, user.id)) notFound()
  return <SalesModule />
}

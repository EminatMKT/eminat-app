import SalesModule from '@/features/annie-sales/SalesModule'
import { notFound } from 'next/navigation'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import { salesQaAllowed } from '@/server/integrations/annie/qa-gate'

export const dynamic = 'force-dynamic'

export default async function SalesPage() {
  const client = ssrClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) notFound()
  const { data: profile, error } = await client.from('usuarios')
    .select('id').eq('auth_id', user.id).eq('activo', true).maybeSingle()
  if (error || !profile?.id || !salesQaAllowed(profile.id, user.id)) notFound()
  return <SalesModule />
}

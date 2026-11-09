import { notFound, redirect } from 'next/navigation'
import { nativeSalesPrimary } from '@/server/sales-native/release-gate'

export const dynamic = 'force-dynamic'

/** Sales has one active implementation; the retired QA bridge is never a fallback. */
export default async function SalesPage() {
  if (nativeSalesPrimary()) redirect('/sales-native')
  notFound()
}

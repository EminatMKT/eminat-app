'use client'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/shell/AppShell'
import AccessDenied from '@/shared/components/access/AccessDenied'
import { PageTransition } from '@/shared/motion'
import { BillingV1Provider } from './BillingV1Context'
import BillingV1Content from './BillingV1Content'

export default function BillingV1Module() {
  const { modules } = useApp()

  if (!modules.includes('cobranzas')) return <AccessDenied message="You do not have access to the Billing module. Contact your administrator." />

  return (
    <AppShell>
      <PageTransition>
        <BillingV1Provider>
          <BillingV1Content />
        </BillingV1Provider>
      </PageTransition>
    </AppShell>
  )
}

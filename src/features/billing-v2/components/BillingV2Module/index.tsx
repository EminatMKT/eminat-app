'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { MODULE } from '@/shared/auth/permissions'
import { AppShell } from '@/shared/components/shell'
import { AccessDenied } from '@/shared/components/access'
import { LoadingView } from '@/shared/components/ui'
import { PageTransition } from '@/shared/motion'
import BillingV2Content from '@/features/billing-v2/components/BillingV2Content'

export default function BillingV2Module() {
  const { modules, loading } = useApp()
  const { t } = useT()

  if (loading) return <AppShell><LoadingView /></AppShell>
  if (!modules.includes(MODULE.COBRANZAS)) return <AccessDenied message={t('billing.noAccess')} />
  return <AppShell><PageTransition><BillingV2Content /></PageTransition></AppShell>
}

// The access gate of billing v2, on the stored `cobranzas` permission. The records are read by the
// content and only by it, so somebody without the module never mounts the loader: the gate is not
// a curtain over data already fetched. RLS refuses the rows anyway; this keeps the request unsent.

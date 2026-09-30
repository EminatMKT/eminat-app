'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { MODULE, MODULE_META } from '@/shared/auth/permissions'
import { AppShell } from '@/shared/components/shell'
import { AccessDenied } from '@/shared/components/access'
import { LoadingView } from '@/shared/components/ui'
import { PageTransition } from '@/shared/motion'
import { useTabPreference } from '@/shared/hooks'
import BillingV2Content from '@/features/billing-v2/components/BillingV2Content'

export default function BillingV2Module() {
  const { modules, loading } = useApp()
  const { t } = useT()
  const [tab, setTab] = useTabPreference<string>(MODULE.COBRANZAS, 'records', ['records', 'overview'])

  if (loading) return <AppShell><LoadingView /></AppShell>
  const denied = t('billing.noAccess', { module: MODULE_META[MODULE.COBRANZAS].name })
  if (!modules.includes(MODULE.COBRANZAS)) return <AccessDenied message={denied} />
  return (
    <AppShell activeTab={tab} onTabChange={setTab}>
      <PageTransition><BillingV2Content tab={tab} /></PageTransition>
    </AppShell>
  )
}

// The access gate of billing v2, on the stored `cobranzas` permission. The records are read by the
// content and only by it, so somebody without the module never mounts the loader: the gate is not
// a curtain over data already fetched. RLS refuses the rows anyway; this keeps the request unsent.
//
// Which tab is open lives here, not in the content: the sidebar's secondary panel (Records,
// Overview — see `appShellConfig/subvistas.ts`, the same pattern Research and Admin use) drives
// it through `AppShell`'s `activeTab`/`onTabChange`, the same way for every module that has one.

'use client'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/shell/AppShell'
import AccessDenied from '@/shared/components/access/AccessDenied'
import { PageTransition } from '@/shared/motion'
import { ResearchProvider } from './ResearchContext'
import ResearchContent from './ResearchContent'
import { useUserPreference } from '@/shared/hooks/useUserPreference'
import { oneOf } from '@/shared/hooks/usePersistedState'

export default function ResearchModule() {
  const { modules } = useApp()
  const [tab, setTab] = useUserPreference('tab-research', 'dashboard', oneOf('dashboard', 'leads', 'newsletter', 'sms', 'mailing', 'pipeline', 'oportunidades'))

  if (!modules.includes('research')) return <AccessDenied message="You don't have access to the Research module." />

  return (
    <AppShell activeTab={tab} onTabChange={setTab}>
      <PageTransition>
        <ResearchProvider>
          <ResearchContent tab={tab} />
        </ResearchProvider>
      </PageTransition>
    </AppShell>
  )
}

'use client'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/AppShell'
import AccessDenied from '@/shared/components/AccessDenied'
import { PageTransition } from '@/shared/motion'
import { CobranzasProvider } from './CobranzasContext'
import CobranzasContent from './CobranzasContent'

export default function CobranzasModule() {
  const { modules } = useApp()

  if (!modules.includes('cobranzas')) return <AccessDenied message="You do not have access to the Billing module. Contact your administrator." />

  return (
    <AppShell>
      <PageTransition>
        <CobranzasProvider>
          <CobranzasContent />
        </CobranzasProvider>
      </PageTransition>
    </AppShell>
  )
}

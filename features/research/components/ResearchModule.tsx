'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/AppShell'
import AccessDenied from '@/shared/components/AccessDenied'
import { PageTransition } from '@/shared/motion'
import { ResearchProvider } from './ResearchContext'
import ResearchContent from './ResearchContent'

export default function ResearchModule() {
  const { modules } = useApp()
  const [tab, setTab] = useState('dashboard')

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

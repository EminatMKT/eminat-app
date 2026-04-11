'use client'
import { useState } from 'react'
import { useApp } from '@/lib/AppContext'
import AppShell from '@/app/components/AppShell'
import ResearchModule from '@/app/components/ResearchModule'
import { PageTransition } from '@/lib/motion'

export default function ResearchPage() {
  const { dark, canResearch, t1, t3, mostrarMensaje } = useApp()
  const [researchTab, setResearchTab] = useState('dashboard')

  return (
    <AppShell activeTab={researchTab} onTabChange={setResearchTab}>
      <PageTransition>
      {canResearch ? (
        <ResearchModule dark={dark} tab={researchTab} setTab={setResearchTab} mostrarMensaje={mostrarMensaje} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Access denied</div>
          <div style={{ fontSize: 13, color: t3, textAlign: 'center', maxWidth: 300 }}>You don't have access to the Research module.</div>
        </div>
      )}
      </PageTransition>
    </AppShell>
  )
}

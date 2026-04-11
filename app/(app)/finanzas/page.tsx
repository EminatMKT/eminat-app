'use client'
import { useApp } from '@/lib/AppContext'
import AppShell from '@/app/components/AppShell'
import { PageTransition } from '@/lib/motion'

export default function FinanzasPage() {
  const { t1, t3 } = useApp()
  return (
    <AppShell title="Finanzas">
      <PageTransition><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
        <div style={{ fontSize: 48 }}>💰</div>
        <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Finance</div>
        <div style={{ fontSize: 13, color: t3, textAlign: 'center', maxWidth: 300 }}>This module will be available soon.</div>
      </div></PageTransition>
    </AppShell>
  )
}

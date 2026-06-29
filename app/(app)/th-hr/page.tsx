'use client'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/AppShell'
import { PageTransition } from '@/shared/motion'

export default function ThHrPage() {
  const { t1, t3 } = useApp()
  return (
    <AppShell title="Talento Humano">
      <PageTransition>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
          <div style={{ fontSize: 48 }}>👤</div>
          <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Talento Humano</div>
          <div style={{ fontSize: 13, color: t3, textAlign: 'center', maxWidth: 320 }}>Este módulo estará disponible pronto.</div>
        </div>
      </PageTransition>
    </AppShell>
  )
}

'use client'
import { useState, ReactNode } from 'react'
import { useApp } from '@/shared/context/AppContext'
import Onboarding from './Onboarding'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import LoadingScreen from './LoadingScreen'
import { D } from './appShellConfig'

interface Props {
  children: ReactNode
  title?: string
  actions?: ReactNode
  activeTab?: string
  onTabChange?: (tab: string) => void
}

// Orquestador del shell: compone Sidebar + Topbar + área de contenido.
// El estado del panel vive en Sidebar; acá solo el toggle del sidebar móvil.
export default function AppShell({ children, title, actions, activeTab, onTabChange }: Props) {
  const { loading, bg } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', height: '100vh', background: D.bg, color: D.t1, fontFamily: 'DM Sans, sans-serif' }}>
      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 49 }} />}

      <Sidebar activeTab={activeTab} onTabChange={onTabChange} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} actions={actions} onHamburger={() => setMobileOpen(!mobileOpen)} />
        {/* CONTENT AREA — always light */}
        <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto', background: bg, color: '#111827' }}>
          {children}
        </div>
      </main>

      <Onboarding />
    </div>
  )
}

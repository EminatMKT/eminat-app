'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import { modulePath, ROUTES, type ModuleSlug } from '@/shared/auth/permissions'
import { D, NAV, PANEL_META, type PanelKey } from './appShellConfig'
import SidebarPanel from './SidebarPanel'
import RailButton from './RailButton'

type Props = {
  activeTab?: string
  onTabChange?: (tab: string) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

// Sidebar = rail de íconos (módulos del usuario) + panel secundario. Dueño de `sidebarPanel`.
// Data-driven desde NAV + modulePath.
export default function Sidebar({ activeTab, onTabChange, mobileOpen, setMobileOpen }: Props) {
  const { usuario, accent, modules } = useApp()
  const router = useRouter()
  const pathname = usePathname()

  const activeNav = NAV.find(i => pathname.startsWith(modulePath(i.slug)))
  const [sidebarPanel, setSidebarPanel] = useState<PanelKey | null>(activeNav?.panel ?? null)
  const activeIconKey = activeNav?.key ?? 'home'

  const navAction = (slug: ModuleSlug, panel?: PanelKey) => panel
    ? () => { setSidebarPanel(p => p === panel ? null : panel); if (!pathname.startsWith(modulePath(slug))) router.push(modulePath(slug)) }
    : () => { router.push(modulePath(slug)); setSidebarPanel(null) }
  const sidebarIcons = [
    { key: 'home', icon: '🏠', label: 'Home', action: () => { router.push(ROUTES.home); setSidebarPanel(null) } },
    ...NAV.filter(i => modules.includes(i.slug)).map(i => ({ key: i.key, icon: i.icon, label: i.label, action: navAction(i.slug, i.panel) })),
  ]

  // El panel secundario solo abre si el usuario tiene el módulo (sin_asignar no ve el submenú).
  const panelOpen = !!sidebarPanel && modules.includes(PANEL_META[sidebarPanel].slug)

  return (
    <aside className={`sidebar-root${mobileOpen ? ' open' : ''}`} style={{ display: 'flex', flexShrink: 0, height: '100vh', position: 'relative', zIndex: 50 }}>
      {/* RAIL de íconos */}
      <div style={{ width: 62, background: D.s1, borderRight: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12 }}>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 4px', width: '100%' }}>
          {sidebarIcons.map(item => (
            <RailButton key={item.key} tourKey={item.key} icon={item.icon} label={item.label} active={activeIconKey === item.key} onClick={() => { item.action(); setMobileOpen(false) }} />
          ))}
        </nav>
        <div style={{ padding: '10px 0 12px', borderTop: `1px solid ${D.border}`, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
              {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#34D399', border: `2px solid ${D.s1}` }} />
          </div>
        </div>
      </div>

      <SidebarPanel open={panelOpen} panel={sidebarPanel ?? 'mkt'} activeTab={activeTab} onTabChange={onTabChange} setMobileOpen={setMobileOpen} />
    </aside>
  )
}

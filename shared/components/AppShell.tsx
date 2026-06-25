'use client'
import { useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import Onboarding from './Onboarding'
import Topbar from './Topbar'
import { D, NAV, SUB_ITEMS, PANEL_META, type PanelKey } from './appShellConfig'

interface Props {
  children: ReactNode
  title?: string
  actions?: ReactNode
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export default function AppShell({ children, title, actions, activeTab, onTabChange }: Props) {
  const app = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarPanel, setSidebarPanel] = useState<PanelKey | null>(
    pathname.startsWith('/research') ? 'research' : pathname.startsWith('/medical') ? 'medical' : pathname.startsWith('/stratix-mkt') ? 'mkt' : null
  )
  const { usuario, accent, cargo, modules, handleLogout, bg } = app

  const activeIconKey = pathname.startsWith('/medical') ? 'medical'
    : pathname.startsWith('/research') ? 'research'
    : pathname.startsWith('/accounting') ? 'accounting'
    : pathname.startsWith('/cobranzas') ? 'cobranzas'
    : pathname.startsWith('/th-hr') ? 'th-hr'
    : pathname.startsWith('/directorio') ? 'directorio'
    : pathname.startsWith('/admin') ? 'admin'
    : pathname.startsWith('/stratix-mkt') ? 'mkt'
    : 'home'

  // Sidebar data-driven: NAV filtrado por los `modules` del usuario. Home siempre presente.
  const navAction = (slug: string, panel?: PanelKey) => panel
    ? () => { setSidebarPanel(p => p === panel ? null : panel); if (!pathname.startsWith('/' + slug)) router.push('/' + slug) }
    : () => { router.push('/' + slug); setSidebarPanel(null) }
  const sidebarIcons = [
    { key: 'home', icon: '🏠', label: 'Home', action: () => { router.push('/'); setSidebarPanel(null) } },
    ...NAV.filter(i => modules.includes(i.slug)).map(i => ({ key: i.key, icon: i.icon, label: i.label, action: navAction(i.slug, i.panel) })),
  ]

  // El panel secundario solo abre si el usuario tiene el módulo (sin_asignar no ve el submenú).
  const panelOpen = !!sidebarPanel && modules.includes(PANEL_META[sidebarPanel].slug)
  const panel = sidebarPanel ?? 'mkt'
  const subItems = SUB_ITEMS[panel]
  const { title: panelTitle, sub: panelSub } = PANEL_META[panel]

  const autoTitle = pathname === '/' ? `Eminat Group — Welcome, ${usuario?.nombre}`
    : pathname.startsWith('/stratix-mkt') ? 'Stratix 360 — Producción'
    : pathname.startsWith('/accounting') ? 'Accounting — Eminat Research'
    : pathname.startsWith('/cobranzas') ? 'EMINAT LLC — Billing Dashboard'
    : pathname.startsWith('/research') ? 'Eminat Research Group'
    : pathname.startsWith('/medical') ? 'Eminat Medical Center — HIPAA'
    : pathname.startsWith('/directorio') ? 'Team Directory'
    : pathname.startsWith('/admin') ? 'Admin Panel'
    : 'Stratix'

  if (app.loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #7C6FF7', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans' }}>Loading Stratix...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: D.bg, color: D.t1, fontFamily: 'DM Sans, sans-serif' }}>
      {mobileSidebarOpen && <div onClick={() => setMobileSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 49 }} />}

      {/* SIDEBAR — always dark */}
      <aside className={`sidebar-root${mobileSidebarOpen ? ' open' : ''}`} style={{ display: 'flex', flexShrink: 0, height: '100vh', position: 'relative', zIndex: 50 }}>
        <div style={{ width: 62, background: D.s1, borderRight: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12 }}>
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 4px', width: '100%' }}>
            {sidebarIcons.map(item => (
              <button key={item.key} data-tour={item.key} onClick={() => { item.action(); setMobileSidebarOpen(false) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, width: 52, height: 52, borderRadius: 12, border: 'none', cursor: 'pointer', background: activeIconKey === item.key ? `${accent}18` : 'transparent', color: activeIconKey === item.key ? accent : D.t2, transition: 'all .15s', position: 'relative' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: 8, fontWeight: 600, fontFamily: 'DM Sans', letterSpacing: '.02em', lineHeight: 1 }}>{item.label}</span>
                {activeIconKey === item.key && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: '0 3px 3px 0', background: accent }} />}
              </button>
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

        {/* SUBMENU PANEL — always dark */}
        <div style={{ width: panelOpen ? 172 : 0, background: D.s1, borderRight: panelOpen ? `1px solid ${D.border}` : 'none', overflow: 'hidden', transition: 'width .2s ease', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 14px 10px' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 13, color: D.t1, whiteSpace: 'nowrap' }}>{panelTitle}</div>
            <div style={{ fontSize: 9, color: D.t3, fontFamily: 'DM Mono', marginTop: 2, whiteSpace: 'nowrap' }}>{panelSub}</div>
          </div>
          <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
            {subItems.map(item => {
              const isActive = activeTab === item.tab
              return (
                <button key={item.id} onClick={() => {
                  if (sidebarPanel === 'mkt' && !pathname.startsWith('/stratix-mkt')) router.push('/stratix-mkt')
                  if (sidebarPanel === 'research' && !pathname.startsWith('/research')) router.push('/research')
                  if (sidebarPanel === 'medical' && !pathname.startsWith('/medical')) router.push('/medical')
                  onTabChange?.(item.tab)
                  setMobileSidebarOpen(false)
                }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500, textAlign: 'left', whiteSpace: 'nowrap', color: isActive ? accent : D.t2, background: isActive ? `${accent}15` : 'transparent', marginBottom: 2, transition: 'all .15s' }}>
                  <span style={{ fontSize: 13 }}>{item.icon}</span>
                  {item.label}
                  {isActive && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: accent }} />}
                </button>
              )
            })}
          </nav>
          <div style={{ padding: 10, borderTop: `1px solid ${D.border}` }}>
            <div style={{ padding: '10px 10px', borderRadius: 10, background: `${accent}08`, border: `1px solid ${accent}15` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                    {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                  </div>
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#34D399', border: `2px solid ${D.s1}` }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: D.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre}</div>
                  <div style={{ fontSize: 9, color: accent, whiteSpace: 'nowrap' }}>{cargo}</div>
                </div>
              </div>
              <div style={{ fontSize: 9, color: D.t3, marginBottom: 6, whiteSpace: 'nowrap' }}>📍 {usuario?.ubicacion || 'Guayaquil, EC'}</div>
              <button onClick={handleLogout} style={{ width: '100%', padding: '4px', borderRadius: 6, border: `1px solid ${D.border}`, background: 'transparent', color: D.t3, fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>Sign out</button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title || autoTitle} actions={actions} onHamburger={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        {/* CONTENT AREA — always light */}
        <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto', background: bg, color: '#111827' }}>
          {children}
        </div>
      </main>

      <Onboarding />
    </div>
  )
}

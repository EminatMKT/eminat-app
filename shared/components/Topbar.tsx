'use client'
import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import { modulePath, ROUTES } from '@/shared/auth/permissions'
import NotificationsBell from './NotificationsBell'
import DevBadge from './DevBadge'
import TopbarBrands from './TopbarBrands'
import OnlineBadge from './OnlineBadge'
import ThemeToggle from './ThemeToggle'
import TopbarMessage from './TopbarMessage'
import { D, NAV, AUTO_TITLE } from './appShellConfig'

export default function Topbar({ title, actions, onHamburger }: { title?: string; actions?: ReactNode; onHamburger: () => void }) {
  const { horaActual, usuario } = useApp()
  const pathname = usePathname()

  // Título: el explícito que pase la página, o uno derivado de la ruta (AUTO_TITLE por slug).
  const activeNav = NAV.find(i => pathname.startsWith(modulePath(i.slug)))
  const autoTitle = pathname === ROUTES.home
    ? `Eminat Group — Welcome, ${usuario?.nombre}`
    : (activeNav && AUTO_TITLE[activeNav.slug]) || 'Stratix'

  return (
    <div style={{ padding: '11px 24px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: D.s1, position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="mobile-hamburger" onClick={onHamburger} style={{ display: 'none', background: 'none', border: `1px solid ${D.border}`, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: D.t1, fontSize: 18, lineHeight: 1 }}>☰</button>
        <DevBadge />
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: D.t1 }}>{title || autoTitle}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 10, color: D.t3, fontFamily: 'DM Mono' }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {horaActual}
            </span>
            <span style={{ width: 1, height: 10, background: D.border }} />
            <TopbarBrands />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <TopbarMessage />
        <NotificationsBell />
        <OnlineBadge />
        <ThemeToggle />
        {actions}
      </div>
    </div>
  )
}

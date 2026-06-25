'use client'
import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useApp, MARCAS_LIST } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { modulePath, ROUTES } from '@/shared/auth/permissions'
import { isDevDb } from '@/shared/db/env.client'
import NotificationsBell from './NotificationsBell'
import { D, NAV, AUTO_TITLE } from './appShellConfig'

export default function Topbar({ title, actions, onHamburger }: { title?: string; actions?: ReactNode; onHamburger: () => void }) {
  const { dark, setDark, horaActual, onlineCount, mensaje, usuario } = useApp()
  const { t } = useT()
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
        {/* Indicador de entorno — solo visible cuando se trabaja contra la base de DESARROLLO */}
        {isDevDb && (
          <span title={t('shell.devTooltip')} style={{ padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', fontFamily: 'DM Mono', background: '#F59E0B22', color: '#F59E0B', border: '1px solid #F59E0B55', flexShrink: 0 }}>DEV</span>
        )}
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: D.t1 }}>{title || autoTitle}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 10, color: D.t3, fontFamily: 'DM Mono' }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {horaActual}
            </span>
            <span style={{ width: 1, height: 10, background: D.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {MARCAS_LIST.map(m => (
                <span key={m.codigo} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontFamily: 'DM Mono', color: m.color, fontWeight: 600, letterSpacing: '.02em' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                  {m.codigo}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {mensaje && (
          <div style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: mensaje.tipo === 'ok' ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)', color: mensaje.tipo === 'ok' ? '#34D399' : '#F87171', border: `1px solid ${mensaje.tipo === 'ok' ? '#34D39940' : '#F8717140'}` }}>
            {mensaje.tipo === 'ok' ? '✓' : '✕'} {mensaje.texto}
          </div>
        )}
        <NotificationsBell />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, background: '#34D39912', border: '1px solid #34D39930' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
          <span style={{ fontSize: 11, color: '#34D399', fontWeight: 500 }}>{onlineCount > 0 ? onlineCount : 1} {t('shell.online')}</span>
        </div>
        <button onClick={() => setDark(!dark)} style={{ padding: '6px 11px', borderRadius: 20, border: `1px solid ${D.border}`, background: D.s2, color: D.t2, fontSize: 11, cursor: 'pointer' }}>
          {dark ? '☀️' : '🌙'}
        </button>
        {actions}
      </div>
    </div>
  )
}

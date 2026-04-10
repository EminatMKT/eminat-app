'use client'
import { useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useApp, MARCAS_LIST } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import Onboarding from './Onboarding'

// Dark constants for sidebar & topbar (always dark)
const D = {
  bg: '#0A0A0F',
  s1: '#111118',
  s2: '#1A1A24',
  border: 'rgba(255,255,255,0.07)',
  t1: '#FFFFFF',
  t2: 'rgba(255,255,255,0.6)',
  t3: 'rgba(255,255,255,0.3)',
}

const mktSubItems = [
  { id: 'sub-overview', icon: '📊', label: 'Dashboard', tab: 'overview' },
  { id: 'sub-prod', icon: '⚡', label: 'Produccion', tab: 'kanban' },
  { id: 'sub-sol', icon: '📋', label: 'Solicitudes', tab: 'solicitudes' },
  { id: 'sub-social', icon: '📱', label: 'Social Media', tab: 'social' },
  { id: 'sub-competencia', icon: '🎯', label: 'Competencia', tab: 'competencia' },
  { id: 'sub-equipo', icon: '👥', label: 'Equipo', tab: 'equipo' },
  { id: 'sub-reporte', icon: '💰', label: 'Reporte', tab: 'reporte' },
]
const medicalSubItems = [
  { id: 'med-dash', icon: '📊', label: 'Dashboard', tab: 'dashboard' },
  { id: 'med-patients', icon: '👥', label: 'Pacientes', tab: 'pacientes' },
  { id: 'med-appointments', icon: '📅', label: 'Citas', tab: 'citas' },
  { id: 'med-hipaa', icon: '🛡️', label: 'HIPAA', tab: 'hipaa' },
  { id: 'med-audit', icon: '📋', label: 'Audit Log', tab: 'audit' },
]
const researchSubItems = [
  { id: 'res-dash', icon: '📊', label: 'Dashboard', tab: 'dashboard' },
  { id: 'res-leads', icon: '👥', label: 'Leads', tab: 'leads' },
  { id: 'res-newsletter', icon: '📧', label: 'Newsletter', tab: 'newsletter' },
  { id: 'res-sms', icon: '📱', label: 'SMS', tab: 'sms' },
  { id: 'res-mailing', icon: '📨', label: 'Mailing', tab: 'mailing' },
  { id: 'res-pipeline', icon: '🎯', label: 'Pipeline', tab: 'pipeline' },
  { id: 'res-opps', icon: '📋', label: 'Oportunidades', tab: 'oportunidades' },
]

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
  const [sidebarPanel, setSidebarPanel] = useState<string | null>(
    pathname.startsWith('/research') ? 'research' : pathname.startsWith('/medical') ? 'medical' : (pathname === '/' || pathname.startsWith('/stratix-mkt')) ? 'mkt' : null
  )
  const { usuario, dark, setDark, horaActual, onlineCount, mensaje, notificaciones, notifAbiertas, setNotifAbiertas, setNotificaciones, accent, cargo, esSuperAdmin, canCobranzas, canResearch, canMedical, handleLogout, mostrarMensaje, bg } = app

  const activeIconKey = pathname.startsWith('/medical') ? 'medical'
    : pathname.startsWith('/research') ? 'research'
    : pathname.startsWith('/cobranzas') ? 'cobranzas'
    : pathname.startsWith('/directorio') ? 'directorio'
    : pathname.startsWith('/admin') ? 'admin'
    : pathname.startsWith('/stratix-mkt') ? 'mkt'
    : pathname === '/' ? 'home' : 'home'

  const sidebarIcons: any[] = [
    { key: 'home', icon: '🏠', label: 'Home', action: () => { router.push('/'); setSidebarPanel(null) } },
    { key: 'mkt', icon: '🚀', label: 'Stratix MKT', action: () => { setSidebarPanel(p => p === 'mkt' ? null : 'mkt'); if (!pathname.startsWith('/stratix-mkt')) router.push('/stratix-mkt') } },
    { key: 'finanzas', icon: '💰', label: 'Finanzas', soon: true, action: () => mostrarMensaje('ok', 'Finanzas — Proximamente') },
    ...(canCobranzas ? [{ key: 'cobranzas', icon: '💳', label: 'Cobranzas', action: () => { router.push('/cobranzas'); setSidebarPanel(null) } }] : []),
    ...(canMedical ? [{ key: 'medical', icon: '🏥', label: 'Medical', action: () => { setSidebarPanel(p => p === 'medical' ? null : 'medical'); if (!pathname.startsWith('/medical')) router.push('/medical') } }] : []),
    { key: 'rrhh', icon: '👤', label: 'TH/HR', soon: true, action: () => mostrarMensaje('ok', 'TH/HR — Proximamente') },
    ...(canResearch ? [{ key: 'research', icon: '🔬', label: 'Research', action: () => { setSidebarPanel(p => p === 'research' ? null : 'research'); if (!pathname.startsWith('/research')) router.push('/research') } }] : [{ key: 'research', icon: '🔬', label: 'Research', soon: true, action: () => mostrarMensaje('ok', 'Research — Proximamente') }]),
    { key: 'directorio', icon: '🏢', label: 'Directorio', action: () => { router.push('/directorio'); setSidebarPanel(null) } },
    ...(esSuperAdmin ? [{ key: 'admin', icon: '🔐', label: 'Admin', action: () => { router.push('/admin'); setSidebarPanel(null) } }] : []),
  ]

  const panelOpen = sidebarPanel === 'mkt' || sidebarPanel === 'research' || sidebarPanel === 'medical'
  const subItems = sidebarPanel === 'research' ? researchSubItems : sidebarPanel === 'medical' ? medicalSubItems : mktSubItems
  const panelTitle = sidebarPanel === 'research' ? 'Research' : sidebarPanel === 'medical' ? 'Medical' : 'Stratix MKT'
  const panelSub = sidebarPanel === 'research' ? 'Clinical Research Ops' : sidebarPanel === 'medical' ? 'HIPAA Compliance' : 'Marketing & Produccion'

  const autoTitle = pathname === '/' ? `Eminat Group — Bienvenido, ${usuario?.nombre}`
    : pathname.startsWith('/stratix-mkt') ? 'Stratix MKT — Produccion'
    : pathname.startsWith('/cobranzas') ? 'EMINAT LLC — Dashboard de Cobranzas'
    : pathname.startsWith('/research') ? 'Eminat Research Group'
    : pathname.startsWith('/medical') ? 'Eminat Medical Center — HIPAA'
    : pathname.startsWith('/directorio') ? 'Directorio del Holding'
    : pathname.startsWith('/admin') ? 'Admin Panel'
    : 'Eminat App'

  if (app.loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #7C6FF7', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans' }}>Cargando Eminat App...</div>
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
            {sidebarIcons.map((item: any) => (
              <button key={item.key} data-tour={item.key} onClick={() => { item.action(); setMobileSidebarOpen(false) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, width: 52, height: 52, borderRadius: 12, border: 'none', cursor: 'pointer', background: activeIconKey === item.key ? `${accent}18` : 'transparent', color: activeIconKey === item.key ? accent : D.t2, transition: 'all .15s', position: 'relative' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: 8, fontWeight: 600, fontFamily: 'DM Sans', letterSpacing: '.02em', lineHeight: 1 }}>{item.label}</span>
                {item.soon && <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: D.t3 }} />}
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
              <button onClick={handleLogout} style={{ width: '100%', padding: '4px', borderRadius: 6, border: `1px solid ${D.border}`, background: 'transparent', color: D.t3, fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>Cerrar sesion</button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* TOPBAR — always dark */}
        <div style={{ padding: '11px 24px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: D.s1, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-hamburger" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} style={{ display: 'none', background: 'none', border: `1px solid ${D.border}`, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: D.t1, fontSize: 18, lineHeight: 1 }}>☰</button>
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
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setNotifAbiertas(!notifAbiertas); if (!notifAbiertas) { const ids = notificaciones.filter((n: any) => !n.leida).map((n: any) => n.id); if (ids.length > 0) supabase.from('notificaciones').update({ leida: true }).in('id', ids).then(() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))) } }}
                style={{ position: 'relative', padding: '7px 9px', borderRadius: 10, border: `1px solid ${D.border}`, background: notifAbiertas ? `${accent}20` : D.s2, color: notifAbiertas ? accent : D.t2, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>
                🔔
                {notificaciones.filter((n: any) => !n.leida).length > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#F87171', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${D.s1}` }}>
                    {notificaciones.filter((n: any) => !n.leida).length > 9 ? '9+' : notificaciones.filter((n: any) => !n.leida).length}
                  </span>
                )}
              </button>
              {notifAbiertas && (
                <div style={{ position: 'absolute', top: '110%', right: 0, width: 320, background: D.s1, border: `1px solid ${D.border}`, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: D.t1 }}>Notificaciones</div>
                    <button onClick={() => { supabase.from('notificaciones').update({ leida: true }).eq('leida', false).then(() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))) }} style={{ fontSize: 11, color: D.t3, background: 'none', border: 'none', cursor: 'pointer' }}>Marcar todas leidas</button>
                  </div>
                  <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                    {notificaciones.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: D.t3 }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                        <div style={{ fontSize: 12 }}>Sin notificaciones</div>
                      </div>
                    ) : notificaciones.map((n: any) => (
                      <div key={n.id} onClick={() => { if (n.actividad_id) { router.push('/stratix-mkt'); setNotifAbiertas(false) } }}
                        style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}`, cursor: n.actividad_id ? 'pointer' : 'default', background: n.leida ? 'transparent' : `${accent}08`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.leida ? 'transparent' : accent, flexShrink: 0, marginTop: 4 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: n.leida ? 400 : 600, color: D.t1 }}>{n.titulo}</div>
                          <div style={{ fontSize: 11, color: D.t2, marginTop: 2, lineHeight: 1.4 }}>{n.mensaje}</div>
                          <div style={{ fontSize: 10, color: D.t3, marginTop: 4 }}>{new Date(n.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, background: '#34D39912', border: '1px solid #34D39930' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
              <span style={{ fontSize: 11, color: '#34D399', fontWeight: 500 }}>{onlineCount > 0 ? onlineCount : 1} online</span>
            </div>
            <button onClick={() => setDark(!dark)} style={{ padding: '6px 11px', borderRadius: 20, border: `1px solid ${D.border}`, background: D.s2, color: D.t2, fontSize: 11, cursor: 'pointer' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            {actions}
          </div>
        </div>

        {/* CONTENT AREA — always light */}
        <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto', background: bg, color: '#111827' }}>
          {children}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes centerPulse { 0%, 100% { box-shadow: 0 0 40px rgba(124,111,247,.25), 0 0 80px rgba(124,111,247,.1); } 50% { box-shadow: 0 0 60px rgba(124,111,247,.4), 0 0 120px rgba(124,111,247,.2); } }
        @keyframes orbitRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .center-pulse > div { animation: centerPulse 3s ease-in-out infinite; }
        .orbit-ring { animation: orbitRotate 60s linear infinite; pointer-events: none; }
        .orbit-ring-inner { animation: orbitRotate 45s linear infinite reverse; pointer-events: none; }
        .brand-node:hover { filter: brightness(1.1); }
        * { scrollbar-width: thin; scrollbar-color: rgba(124,111,247,0.3) transparent; }
        *::-webkit-scrollbar { width: 4px; height: 4px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: rgba(124,111,247,0.3); border-radius: 2px; }
        @media (max-width: 768px) {
          .sidebar-root { position: fixed !important; left: 0; top: 0; bottom: 0; transform: translateX(-100%); transition: transform .25s ease; }
          .sidebar-root.open { transform: translateX(0); }
          .mobile-hamburger { display: flex !important; }
        }
        @media print {
          aside { display: none !important; }
          main > div:first-child { display: none !important; }
          #reporte-controls { display: none !important; }
          body, html { background: white !important; }
          main { overflow: visible !important; }
          #print-header { display: block !important; }
          #reporte-content { color: #111 !important; }
          #reporte-content * { color: #111 !important; border-color: #ccc !important; }
          #reporte-content div[style*="background"] { background: #f9f9f9 !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <Onboarding />
    </div>
  )
}

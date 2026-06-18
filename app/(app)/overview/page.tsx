'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/AppContext'
import AppShell from '@/app/components/AppShell'
import { PageTransition } from '@/shared/motion'
import { useRouter } from 'next/navigation'

/**
 * /overview — admin-only panoramic view.
 *
 * Restored from the previous (orbital) home page. Reached via the
 * "Ver todo" CTA on the launchpad (only rendered for the admin role).
 * Middleware already enforces admin access for /overview (see moduleForPath
 * special-case in lib/permissions.ts). The in-page redirect is a
 * belt-and-suspenders guard for clients that get here without the new JWT
 * claim yet.
 */

export default function OverviewPage() {
  const { usuario, horaActual, esSuperAdmin, s1, border, t1, t2, t3, accent, mostrarMensaje, loading } = useApp()
  const router = useRouter()
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null)

  // Belt-and-suspenders client guard: bounce non-admins back to launchpad.
  useEffect(() => {
    if (!loading && usuario && !esSuperAdmin) router.replace('/')
  }, [loading, usuario, esSuperAdmin, router])

  const brandNodes = [
    { key: 'mkt', icon: '🚀', name: 'Stratix 360', color: accent, loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Marketing and creative production agency of Eminat Group.', action: () => router.push('/stratix-mkt') },
    { key: 'emc', icon: '🏥', name: 'EMC Medical Center', color: '#60A5FA', loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Medical center specialized in integrative health and wellness.', action: () => mostrarMensaje('ok', 'EMC Medical Center — Coming soon') },
    { key: 'svn', icon: '💎', name: 'Soy Vivi Negrete', color: '#F472B6', loc: 'Miami', tz: 'America/New_York', desc: 'Personal brand for lifestyle, fashion and digital content.', action: () => mostrarMensaje('ok', 'Soy Vivi Negrete — Coming soon') },
    { key: 'erg', icon: '🔬', name: 'Eminat Research Group', color: '#A78BFA', loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Research and innovation division of Eminat Group.', action: () => mostrarMensaje('ok', 'Eminat Research Group — Coming soon') },
    { key: 'vnf', icon: '🤝', name: 'VN Foundation', color: '#FB923C', loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Social foundation focused on education and community development.', action: () => mostrarMensaje('ok', 'VN Foundation — Coming soon') },
    { key: 'premier', icon: '🏆', name: 'Premier', color: '#34D399', loc: 'Miami', tz: 'America/New_York', desc: 'Premium division for exclusive services and products.', action: () => mostrarMensaje('ok', 'Premier — Coming soon') },
    { key: 'ornella', icon: '🤖', name: 'Ornella IA', color: '#F87171', loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Artificial intelligence and automation platform.', action: () => mostrarMensaje('ok', 'Ornella IA — Coming soon') },
    { key: 'mentor', icon: '📚', name: 'Eminat Mentor', color: '#FBB040', loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Educational platform for professional training and mentoring.', action: () => mostrarMensaje('ok', 'Eminat Mentor — Coming soon') },
  ]
  const radius = 220
  const getLocalTime = (tz: string) => { try { return new Date().toLocaleTimeString('es-EC', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) } catch { return horaActual } }

  return (
    <AppShell title="Eminat Group — Vista panorámica">
      <PageTransition>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)', position: 'relative' }}>
          <div className="orbit-ring" style={{ position: 'absolute', width: radius * 2 + 80, height: radius * 2 + 80, borderRadius: '50%', border: `1px solid ${border}` }} />
          <div className="orbit-ring-inner" style={{ position: 'absolute', width: radius * 2 - 40, height: radius * 2 - 40, borderRadius: '50%', border: `1px dashed ${border}` }} />

          <div className="center-pulse" style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: s1, border: `2px solid ${accent}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${accent}40, 0 0 80px ${accent}15` }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 11, color: accent, lineHeight: 1.1, textAlign: 'center' }}>Eminat</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 12, color: t1, lineHeight: 1 }}>Group</div>
            </div>
          </div>

          {brandNodes.map((brand, i) => {
            const angle = (i * 360 / brandNodes.length - 90) * (Math.PI / 180)
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            const isHovered = hoveredBrand === brand.key
            return (
              <div key={brand.key} style={{ position: 'absolute', transform: `translate(${x}px, ${y}px)`, zIndex: isHovered ? 10 : 1 }}>
                <svg style={{ position: 'absolute', left: '50%', top: '50%', width: 1, height: 1, overflow: 'visible', pointerEvents: 'none', zIndex: -1 }}>
                  <line x1="0" y1="0" x2={-x} y2={-y} stroke={brand.color} strokeWidth={isHovered ? 1.5 : 0.5} strokeOpacity={isHovered ? 0.6 : 0.15} strokeDasharray={isHovered ? 'none' : '4 4'} />
                </svg>
                <button onClick={brand.action} onMouseEnter={() => setHoveredBrand(brand.key)} onMouseLeave={() => setHoveredBrand(null)}
                  className="brand-node" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform .2s', transform: isHovered ? 'scale(1.12)' : 'scale(1)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: s1, border: `2px solid ${isHovered ? brand.color : border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, transition: 'all .25s', boxShadow: isHovered ? `0 0 20px ${brand.color}40` : 'none' }}>
                    {brand.icon}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isHovered ? brand.color : t1, fontFamily: 'DM Sans', textAlign: 'center', maxWidth: 90, lineHeight: 1.2, transition: 'color .2s' }}>{brand.name}</div>
                  <div style={{ fontSize: 8, color: t3, fontFamily: 'DM Mono', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span>📍 {brand.loc}</span>
                    <span style={{ color: brand.color }}>{getLocalTime(brand.tz)}</span>
                  </div>
                </button>
                {isHovered && (
                  <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8, background: s1, border: `1px solid ${brand.color}40`, borderRadius: 12, padding: '12px 14px', width: 200, zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: brand.color, marginBottom: 4 }}>{brand.name}</div>
                    <div style={{ fontSize: 10, color: t2, lineHeight: 1.5 }}>{brand.desc}</div>
                    <div style={{ marginTop: 8, fontSize: 9, color: t3, display: 'flex', justifyContent: 'space-between' }}>
                      <span>📍 {brand.loc}</span>
                      <span style={{ fontFamily: 'DM Mono', color: brand.color }}>{getLocalTime(brand.tz)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Back to launchpad */}
          <button
            onClick={() => router.push('/')}
            style={{
              position: 'absolute', top: 20, left: 0,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 999,
              background: s1, border: `1px solid ${border}`, color: t2,
              fontSize: 11, fontFamily: 'DM Sans', cursor: 'pointer',
            }}
          >
            ← Volver al launchpad
          </button>
        </div>
      </PageTransition>
    </AppShell>
  )
}

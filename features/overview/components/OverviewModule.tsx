'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/AppShell'
import { PageTransition } from '@/shared/motion'
import { BRANDS } from '../data'
import type { Brand } from '../types'
import BrandOrbitNode from './BrandOrbitNode'

/**
 * Vista panorámica admin-only (orbital). Se llega vía el CTA "Ver todo" del
 * launchpad (solo para admin). El middleware ya exige admin para /overview
 * (ver moduleForPath en shared/auth/permissions.ts); este redirect en cliente
 * es un guard extra para clientes sin el claim nuevo en el JWT.
 */
export default function OverviewModule() {
  const { usuario, horaActual, esSuperAdmin, s1, border, t1, t2, accent, mostrarMensaje, loading } = useApp()
  const router = useRouter()
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null)
  const radius = 220

  // Guard de cliente: rebota a no-admins al launchpad.
  useEffect(() => {
    if (!loading && usuario && !esSuperAdmin) router.replace('/')
  }, [loading, usuario, esSuperAdmin, router])

  const handleClick = (brand: Brand) =>
    brand.route ? router.push(brand.route) : mostrarMensaje('ok', `${brand.name} — Coming soon`)

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

          {BRANDS.map((brand, i) => (
            <BrandOrbitNode key={brand.key} brand={brand} index={i} total={BRANDS.length} radius={radius}
              hovered={hoveredBrand === brand.key} fallbackTime={horaActual}
              onEnter={() => setHoveredBrand(brand.key)} onLeave={() => setHoveredBrand(null)}
              onClick={() => handleClick(brand)} />
          ))}

          <button onClick={() => router.push('/')}
            style={{ position: 'absolute', top: 20, left: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: s1, border: `1px solid ${border}`, color: t2, fontSize: 11, fontFamily: 'DM Sans', cursor: 'pointer' }}>
            ← Volver al launchpad
          </button>
        </div>
      </PageTransition>
    </AppShell>
  )
}

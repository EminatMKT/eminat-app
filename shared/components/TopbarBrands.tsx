'use client'
import { MARCAS_LIST } from '@/shared/context/AppContext'

// Chips de las marcas del grupo en el topbar.
export default function TopbarBrands() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {MARCAS_LIST.map(m => (
        <span key={m.codigo} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontFamily: 'DM Mono', color: m.color, fontWeight: 600, letterSpacing: '.02em' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
          {m.codigo}
        </span>
      ))}
    </div>
  )
}

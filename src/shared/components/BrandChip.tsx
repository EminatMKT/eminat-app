'use client'

// Un chip de marca (código + punto de color) en el topbar.
export default function BrandChip({ codigo, color }: { codigo: string; color: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontFamily: 'DM Mono', color, fontWeight: 600, letterSpacing: '.02em' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {codigo}
    </span>
  )
}

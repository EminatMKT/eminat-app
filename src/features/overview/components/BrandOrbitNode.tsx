'use client'
import { useApp } from '@/shared/context/AppContext'
import { getLocalTime } from '../time'
import type { Brand } from '../types'

type Props = {
  brand: Brand
  index: number
  total: number
  radius: number
  hovered: boolean
  fallbackTime: string
  onEnter: () => void
  onLeave: () => void
  onClick: () => void
}

export default function BrandOrbitNode({ brand, index, total, radius, hovered, fallbackTime, onEnter, onLeave, onClick }: Props) {
  const { s1, border, t1, t2, t3 } = useApp()
  const angle = (index * 360 / total - 90) * (Math.PI / 180)
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  const time = getLocalTime(brand.tz, fallbackTime)

  return (
    <div style={{ position: 'absolute', transform: `translate(${x}px, ${y}px)`, zIndex: hovered ? 10 : 1 }}>
      <svg style={{ position: 'absolute', left: '50%', top: '50%', width: 1, height: 1, overflow: 'visible', pointerEvents: 'none', zIndex: -1 }}>
        <line x1="0" y1="0" x2={-x} y2={-y} stroke={brand.color} strokeWidth={hovered ? 1.5 : 0.5} strokeOpacity={hovered ? 0.6 : 0.15} strokeDasharray={hovered ? 'none' : '4 4'} />
      </svg>
      <button onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}
        className="brand-node" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform .2s', transform: hovered ? 'scale(1.12)' : 'scale(1)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: s1, border: `2px solid ${hovered ? brand.color : border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, transition: 'all .25s', boxShadow: hovered ? `0 0 20px ${brand.color}40` : 'none' }}>
          {brand.icon}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: hovered ? brand.color : t1, fontFamily: 'DM Sans', textAlign: 'center', maxWidth: 90, lineHeight: 1.2, transition: 'color .2s' }}>{brand.name}</div>
        <div style={{ fontSize: 8, color: t3, fontFamily: 'DM Mono', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span>📍 {brand.loc}</span>
          <span style={{ color: brand.color }}>{time}</span>
        </div>
      </button>
      {hovered && (
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8, background: s1, border: `1px solid ${brand.color}40`, borderRadius: 12, padding: '12px 14px', width: 200, zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: brand.color, marginBottom: 4 }}>{brand.name}</div>
          <div style={{ fontSize: 10, color: t2, lineHeight: 1.5 }}>{brand.desc}</div>
          <div style={{ marginTop: 8, fontSize: 9, color: t3, display: 'flex', justifyContent: 'space-between' }}>
            <span>📍 {brand.loc}</span>
            <span style={{ fontFamily: 'DM Mono', color: brand.color }}>{time}</span>
          </div>
        </div>
      )}
    </div>
  )
}

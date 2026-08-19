'use client'
import { useApp } from '@/shared/context/AppContext'

type Marca = { codigo: string; color: string; total: number }

export default function BrandBar({ m, maxMarca }: { m: Marca; maxMarca: number }) {
  const { border, t2, t3 } = useApp()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: t2, width: 52 }}>{m.codigo}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: border, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, background: m.color, width: `${(m.total / maxMarca) * 100}%` }} />
      </div>
      <span style={{ fontSize: 10, color: t3, width: 24, textAlign: 'right' }}>{m.total}</span>
    </div>
  )
}

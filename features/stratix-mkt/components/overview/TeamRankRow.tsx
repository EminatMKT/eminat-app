'use client'
import { useApp } from '@/shared/context/AppContext'

type Miembro = { ref: string; nombre: string; total: number; completadas: number; horas: number }

export default function TeamRankRow({ m, i, maxMiembro }: { m: Miembro; i: number; maxMiembro: number }) {
  const { accent, border, t1, t3 } = useApp()
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: t3, width: 12 }}>{i + 1}</span>
          <span style={{ fontSize: 11, color: t1, fontWeight: 500 }}>{m.nombre}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 9, color: '#34D399' }}>{m.completadas}✓</span>
          <span style={{ fontSize: 9, color: t3 }}>{m.horas}h</span>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: border, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, background: accent, width: `${(m.total / maxMiembro) * 100}%` }} />
      </div>
    </div>
  )
}

'use client'
import { useApp } from '@/shared/context/AppContext'

type Datos = { mes: string; total: number; completadas: number }

export default function MonthBar({ d, maxTotal }: { d: Datos; maxTotal: number }) {
  const { accent, t3 } = useApp()
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontSize: 8, color: t3 }}>{d.total}</div>
      <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 66 }}>
        <div style={{ flex: 1, background: `${accent}30`, borderRadius: '3px 3px 0 0', height: `${(d.total / maxTotal) * 100}%`, minHeight: d.total > 0 ? 3 : 0 }} />
        <div style={{ flex: 1, background: '#34D399', borderRadius: '3px 3px 0 0', height: `${(d.completadas / maxTotal) * 100}%`, minHeight: d.completadas > 0 ? 3 : 0 }} />
      </div>
      <div style={{ fontSize: 9, color: t3 }}>{d.mes}</div>
    </div>
  )
}

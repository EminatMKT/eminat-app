'use client'
import { useApp } from '@/shared/context/AppContext'
import type { ResumenHoras } from '../../types'

export default function TeamReportCard({ r }: { r: ResumenHoras }) {
  const { s1, s2, border, accent, t1, t3 } = useApp()
  const stats = [
    { label: 'Total', value: r.total, color: t1 },
    { label: 'Completed', value: r.completadas, color: '#34D399' },
    { label: 'Completion rate', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: accent },
  ]
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t1 }}>{r.nombre}</div>
          <div style={{ fontSize: 10, color: t3 }}>{r.ref}</div>
        </div>
        <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#60A5FA' }}>{r.horas}h</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: s2, borderRadius: 8, padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: t3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

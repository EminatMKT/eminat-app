'use client'
import { useApp } from '@/shared/context/AppContext'

type Resumen = { ref: string; nombre: string; total: number; completadas: number; horas: number; dias: number }

export default function HoursSummaryCard({ r }: { r: Resumen }) {
  const { s1, s2, border, accent, t1, t3 } = useApp()
  const stats = [
    { label: 'Total tasks', value: r.total, color: t1 },
    { label: 'Completed', value: r.completadas, color: '#34D399' },
    { label: 'Completion rate', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: accent },
  ]
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t1 }}>{r.nombre}</div>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{r.ref}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Syne', fontSize: 30, fontWeight: 800, color: '#60A5FA', lineHeight: 1 }}>{r.horas}h</div>
          <div style={{ fontSize: 10, color: t3 }}>{r.dias} production days</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 5, borderRadius: 3, background: border, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, background: '#34D399', width: `${r.total > 0 ? (r.completadas / r.total) * 100 : 0}%` }} />
      </div>
    </div>
  )
}

'use client'
import KpiCard from './KpiCard'

type Kpi = { label: string; value: string | number; color: string }

export default function KpiRow({ items }: { items: Kpi[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
      {items.map(k => <KpiCard key={k.label} label={k.label} value={k.value} color={k.color} />)}
    </div>
  )
}

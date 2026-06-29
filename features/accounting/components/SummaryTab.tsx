import { ventas, ACCENT } from '../data'
import { totals, ventasPorLab, depositosPorBanco } from '../aggregates'
import { fmt } from '../format'
import SectionCard from './SectionCard'
import Bar from './Bar'
import StatCard from './StatCard'

export default function SummaryTab() {
  const maxLab = Math.max(...ventasPorLab.map(x => x[1]))
  const maxBanco = Math.max(...depositosPorBanco.map(x => x[1]))
  return (
    <div>
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard label="Sales 1Q" value={fmt(ventas.filter(v => v.periodo === '1Q').reduce((a, b) => a + b.monto, 0))} color={ACCENT.purple} />
        <StatCard label="Sales 2Q" value={fmt(ventas.filter(v => v.periodo === '2Q').reduce((a, b) => a + b.monto, 0))} color={ACCENT.teal} />
        <StatCard label="Overdue" value={fmt(totals.totalVencido)} color={ACCENT.red} />
        <StatCard label="Not Yet Due" value={fmt(totals.totalPorVencer)} color={ACCENT.yellow} />
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        <SectionCard title="Sales by Laboratory" subtitle="March, all periods">
          {ventasPorLab.map(([lab, val]) => <Bar key={lab} label={lab} value={val} max={maxLab} color={ACCENT.purple} />)}
        </SectionCard>
        <SectionCard title="Deposits by Bank" subtitle="March, all periods">
          {depositosPorBanco.map(([banco, val]) => <Bar key={banco} label={banco} value={val} max={maxBanco} color={ACCENT.teal} />)}
        </SectionCard>
      </div>
    </div>
  )
}

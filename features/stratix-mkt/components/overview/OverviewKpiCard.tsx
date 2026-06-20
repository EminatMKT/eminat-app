'use client'
import { useApp } from '@/shared/context/AppContext'
import { StaggerItem, AnimatedNumber } from '@/shared/motion'

type Kpi = { label: string; value: number | string; color: string; sub: string }

export default function OverviewKpiCard({ kpi, pctCompletado }: { kpi: Kpi; pctCompletado: number }) {
  const { s1, border, t3 } = useApp()
  return (
    <StaggerItem style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, fontFamily: 'DM Mono' }}>{kpi.label}</div>
      <div style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, lineHeight: 1, color: kpi.color }}>{typeof kpi.value === 'number' ? <AnimatedNumber value={kpi.value} /> : kpi.value}</div>
      <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>{kpi.sub}</div>
      <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: border }}>
        <div style={{ height: 2, borderRadius: 1, background: kpi.color, width: `${pctCompletado}%` }} />
      </div>
    </StaggerItem>
  )
}

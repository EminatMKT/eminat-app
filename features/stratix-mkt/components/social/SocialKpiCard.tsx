'use client'
import { useApp } from '@/shared/context/AppContext'
import { cardStyle } from './social-format'

type Kpi = { label: string; value: string; valueColor: string; sub: string; subAccent?: boolean }

export default function SocialKpiCard({ kpi }: { kpi: Kpi }) {
  const { s1, border, t3 } = useApp()
  return (
    <div style={{ ...cardStyle(s1, border), display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>{kpi.label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: kpi.valueColor }}>{kpi.value}</div>
      <div style={{ fontSize: 10, color: kpi.subAccent ? '#34D399' : t3 }}>{kpi.sub}</div>
    </div>
  )
}

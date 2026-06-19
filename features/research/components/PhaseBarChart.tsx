'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { RESEARCH_THEME } from '../theme'
import { CHART_COLORS } from '../constants'

export default function PhaseBarChart({ data }: { data: { name: string; value: number }[] }) {
  const { s1, border, t1, t3 } = RESEARCH_THEME
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Leads by Phase</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}><XAxis dataKey="name" tick={{ fontSize: 10, fill: t3 }} /><YAxis tick={{ fontSize: 10, fill: t3 }} /><Tooltip contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
        </Bar></BarChart>
      </ResponsiveContainer>
    </div>
  )
}

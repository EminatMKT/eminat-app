'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { useResearchTheme } from '../theme'
import { CHART_COLORS } from '../constants'

type Datum = { name: string; value: number }

// Card con BarChart coloreado. vertical=true → barras horizontales (Top Sponsors);
// default → barras verticales (Leads by Phase).
export default function BarChartCard({ title, data, vertical = false, height, yWidth = 120 }: { title: string; data: Datum[]; vertical?: boolean; height?: number; yWidth?: number }) {
  const { s1, border, t1, t3 } = useResearchTheme()
  const tooltipStyle = { background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>{title}</div>
      <ResponsiveContainer width="100%" height={height ?? (vertical ? 200 : 220)}>
        {vertical ? (
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 9, fill: t3 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: t3 }} width={yWidth} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: t3 }} />
            <YAxis tick={{ fontSize: 10, fill: t3 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

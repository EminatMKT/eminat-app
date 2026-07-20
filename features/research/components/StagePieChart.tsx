'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { RESEARCH_THEME } from '../theme'
import { PIPELINE_COLORS, CHART_COLORS, stageLabel } from '../constants'
import { useT } from '@/shared/i18n'
import StageLegendItem from './StageLegendItem'

export default function StagePieChart({ data }: { data: { name: string; value: number }[] }) {
  const { s1, border, accent } = RESEARCH_THEME
  const { t } = useT()
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Pipeline by Stage</div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
          {data.map((d, i) => <Cell key={i} fill={PIPELINE_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie><Tooltip formatter={(value, name) => [value, stageLabel(String(name), t)]} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {data.map(d => <StageLegendItem key={d.name} name={stageLabel(d.name, t)} value={d.value} color={PIPELINE_COLORS[d.name] || accent} />)}
      </div>
    </div>
  )
}

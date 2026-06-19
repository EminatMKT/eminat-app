'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '@/shared/context/AppContext'
import { CHART_COLORS } from '../constants'
import { fmt } from '../format'
import ChartCard from './ChartCard'
import LegendDot from './LegendDot'

type Datum = { name: string; value: number }

export default function PieWithLegend({ title, data }: { title: string; data: Datum[] }) {
  const { s1, border } = useApp()
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {data.map((d, i) => <LegendDot key={d.name} label={d.name} color={CHART_COLORS[i % CHART_COLORS.length]} />)}
      </div>
    </ChartCard>
  )
}

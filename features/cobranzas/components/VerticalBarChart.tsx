'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { useApp } from '@/shared/context/AppContext'
import { CHART_COLORS } from '../constants'
import { fmt } from '../format'
import ChartCard from './ChartCard'

type Datum = { name: string; value: number }

export default function VerticalBarChart({ title, data, yWidth = 100 }: { title: string; data: Datum[]; yWidth?: number }) {
  const { s1, border, t3 } = useApp()
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 9, fill: t3 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: t3 }} width={yWidth} />
          <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

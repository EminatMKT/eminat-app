'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { fmt } from '../format'
import ChartCard from './ChartCard'
import LegendDot from './LegendDot'

type Datum = { name: string; value: number }

export default function DonutPastDue({ data }: { data: Datum[] }) {
  const { s1, border } = useApp()
  const { t } = useT()
  return (
    <ChartCard title={t('cob.pastDueVsUpcoming')}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
            <Cell fill="#F87171" /><Cell fill="#FBB040" />
          </Pie>
          <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
        <LegendDot label={t('cob.pastDue')} color="#F87171" />
        <LegendDot label={t('cob.upcoming')} color="#FBB040" />
      </div>
    </ChartCard>
  )
}

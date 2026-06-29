'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { fmt } from '../format'
import ChartCard from './ChartCard'

type Datum = { name: string; vencido: number; por_vencer: number }

export default function DebtByStudyChart({ data }: { data: Datum[] }) {
  const { s1, border, t3 } = useApp()
  const { t } = useT()
  return (
    <ChartCard title={t('cob.debtByStudy')}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: t3 }} />
          <YAxis tick={{ fontSize: 9, fill: t3 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="vencido" fill="#F87171" radius={[4, 4, 0, 0]} name={t('cob.pastDue')} />
          <Bar dataKey="por_vencer" fill="#FBB040" radius={[4, 4, 0, 0]} name={t('cob.upcoming')} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

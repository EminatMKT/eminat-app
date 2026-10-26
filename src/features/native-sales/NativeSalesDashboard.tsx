'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, Target, CircleCheck, CircleX } from 'lucide-react'
import { useT } from '@/shared/i18n'
import s from './NativeSalesDashboard.module.css'

export type SalesSummary = {
  asOf: string; scope: string
  leads: { total: number; byStatus: { code: string; count: number }[] }
  opportunities: { total: number; byStage: { code: string; label: string; outcome: string; count: number }[];
    won: number; lost: number; open: number; openByCurrency: { currency: string; amount: string }[] }
}
const palette = ['#7865d9', '#167d8d', '#dc7c63', '#40557b', '#bd8c35']
const tooltip = { background: '#fff', border: '1px solid #deddea', borderRadius: 10, color: '#24334a', fontSize: 13 }
const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

/** Presentation only: every chart uses the same authorized summary as the KPI cards. */
export default function NativeSalesDashboard({ summary }: { summary: SalesSummary }) {
  const { t } = useT()
  const leads = summary.leads.byStatus.map(row => ({ name: label(row.code), value: row.count }))
  const stages = summary.opportunities.byStage.map(row => ({ name: row.label || label(row.code), value: row.count }))
  const outcomes = [
    { name: t('sales.dashboard.open'), value: summary.opportunities.open },
    { name: t('sales.dashboard.won'), value: summary.opportunities.won },
    { name: t('sales.dashboard.lost'), value: summary.opportunities.lost },
  ]
  const kpis = [
    { name: t('salesNative.tabLeads'), value: summary.leads.total, Icon: Users },
    { name: t('sales.dashboard.openOpportunities'), value: summary.opportunities.open, Icon: Target },
    { name: t('sales.dashboard.won'), value: summary.opportunities.won, Icon: CircleCheck },
    { name: t('sales.dashboard.lost'), value: summary.opportunities.lost, Icon: CircleX },
  ]
  const table = (rows: { name: string; value: number }[]) => <details className={s.data}>
    <summary>{t('sales.dashboard.viewData')}</summary>
    <table><thead><tr><th scope="col">{t('sales.dashboard.status')}</th><th scope="col">{t('sales.dashboard.count')}</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.value}</td></tr>)}</tbody></table>
  </details>
  const bars = (rows: { name: string; value: number }[]) => <div className={s.chart}>
    <ResponsiveContainer width="100%" height={Math.max(240, rows.length * 42)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 22, left: 0, bottom: 8 }} accessibilityLayer>
        <CartesianGrid stroke="#edf0f5" horizontal={false} />
        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#647089', fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={118} axisLine={false} tickLine={false} tick={{ fill: '#49546c', fontSize: 11 }} />
        <Tooltip contentStyle={tooltip} cursor={{ fill: '#7865d90c' }} />
        <Bar dataKey="value" name={t('sales.dashboard.count')} radius={[0, 5, 5, 0]} maxBarSize={24} isAnimationActive={false}>
          {rows.map((row, index) => <Cell key={row.name} fill={palette[index % palette.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
  return <div className={s.dashboard}>
    <div className={s.metrics}>{kpis.map(({ name, value, Icon }, index) =>
      <article key={name} className={s.metric} style={{ borderTopColor: palette[index] }}>
        <div><p>{name}</p><strong>{value}</strong></div><Icon size={22} aria-hidden="true" />
      </article>)}</div>
    <div className={s.grid}>
      <section className={s.panel} aria-label={t('salesNative.leadsByStage')}>
        <header><h2>{t('salesNative.leadsByStage')}</h2><span>{summary.leads.total}</span></header>
        {leads.some(row => row.value > 0) ? bars(leads) : <p className={s.empty}>{t('sales.dashboard.empty')}</p>}
        {table(leads)}
      </section>
      <section className={s.panel} aria-label={t('sales.dashboard.outcomes')}>
        <header><h2>{t('sales.dashboard.outcomes')}</h2><span>{summary.opportunities.total}</span></header>
        {outcomes.some(row => row.value > 0) ? <div className={s.chart}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart accessibilityLayer><Pie data={outcomes} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="82%"
              paddingAngle={3} isAnimationActive={false}>
              {outcomes.map((row, index) => <Cell key={row.name} fill={palette[index]} />)}
            </Pie><Tooltip contentStyle={tooltip} /></PieChart>
          </ResponsiveContainer>
        </div> : <p className={s.empty}>{t('sales.dashboard.empty')}</p>}
        <ul className={s.legend}>{outcomes.map((row, index) => <li key={row.name}>
          <i style={{ background: palette[index] }} aria-hidden="true" /><span>{row.name}</span><strong>{row.value}</strong>
        </li>)}</ul>{table(outcomes)}
      </section>
      <section className={`${s.panel} ${s.wide}`} aria-label={t('salesNative.opportunitiesByStage')}>
        <header><h2>{t('salesNative.opportunitiesByStage')}</h2><span>{summary.opportunities.total}</span></header>
        {stages.some(row => row.value > 0) ? bars(stages) : <p className={s.empty}>{t('sales.dashboard.empty')}</p>}
        {table(stages)}
      </section>
    </div>
    <p className={s.caption}>{t(summary.scope === 'organization' ? 'sales.dashboard.organizationScope' : 'sales.dashboard.personalScope')}
      {' · '}{t('sales.dashboard.updated')} {summary.asOf.slice(0,10)}</p>
  </div>
}

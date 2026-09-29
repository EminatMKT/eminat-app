'use client'
import type { CSSProperties } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, type PieLabelRenderProps } from 'recharts'
import LegendItem from '@/shared/components/dashboard/LegendItem'
import Panel from '@/shared/components/dashboard/Panel'
import ChartFilterHint from '@/shared/components/dashboard/ChartFilterHint'
import type { Props } from './types'
import s from './index.module.css'
const RAD = Math.PI / 180
const OUTER_RADIUS = '90%'
const INNER_RADIUS = '55%'
const LEGEND_COLUMNS = 'minmax(0, auto) max-content max-content'
const LEGEND_STYLE = { '--legend-columns': LEGEND_COLUMNS } as CSSProperties
/** A pie or donut chart with its own legend — see `Props` in `./types` for the full contract. */
export default function PieChartCard(props: Props) {
  const { title, persistKey, data, colors, onSelect, selected, donut = false, centerLabel, formatValue } = props
  const labelOf = props.labelOf ?? (n => n)
  const total = data.reduce((sum, d) => sum + d.value, 0)
  // In-slice %, skipped under 5% and on a donut (clipped there; `centerLabel`/legend cover it).
  const percentLabel = (label: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, index } = label
    if (donut) return null
    const value = data[Number(index)]?.value ?? 0
    if (!total || value / total < 0.05) return null
    const r = (Number(innerRadius) + Number(outerRadius)) / 2
    const x = Number(cx) + r * Math.cos(-Number(midAngle) * RAD)
    const y = Number(cy) + r * Math.sin(-Number(midAngle) * RAD)
    return <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className={s.percentText}>{Math.round((value / total) * 100)}%</text>
  }
  return (
    <Panel collapsible persistKey={persistKey} title={title}
      right={onSelect ? <ChartFilterHint label={selected ? labelOf(selected) : undefined} onClear={() => selected && onSelect(selected)} /> : undefined}>
      <div className={s.row}>
        <div className={s.chartWrap}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={donut ? INNER_RADIUS : 0} outerRadius={OUTER_RADIUS} paddingAngle={0} stroke="none" dataKey="value" labelLine={false} label={percentLabel} isAnimationActive={false}>
              {data.map(d => <Cell key={d.name} fill={colors[d.name]} fillOpacity={selected && d.name !== selected ? 0.28 : 1}
                onClick={onSelect ? () => onSelect(d.name) : undefined} className={onSelect ? s.clickable : undefined} />)}
            </Pie><Tooltip formatter={(value, name) => [formatValue ? formatValue(Number(value)) : value, labelOf(String(name))]} /></PieChart>
          </ResponsiveContainer>
          {donut && centerLabel && <div className={s.center}>{centerLabel}</div>}
        </div>
        <div className={s.legend} style={LEGEND_STYLE}>
          {data.map(d => <LegendItem key={d.name} name={labelOf(d.name)} value={d.value} total={total} color={colors[d.name]} formatValue={formatValue} />)}
        </div>
      </div>
    </Panel>
  )
}
// Per-instance color is the legend swatch and each slice's fill; the rest lives in the CSS module.

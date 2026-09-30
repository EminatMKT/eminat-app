'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import LegendItem from '@/shared/components/dashboard/LegendItem'
import Panel from '@/shared/components/dashboard/Panel'
import ChartFilterHint from '@/shared/components/dashboard/ChartFilterHint'
import chart from './actions'
import EMPTY_CHART_TEXT from './constants/empty-chart-text'
import LEGEND_STYLE from './constants/legend-style'
import type { Props } from './types'
import s from './index.module.css'
// centinela-exime: bloques-similares@6 — tried extracting the shared chart helper first; existing
// dashboard pieces still lack selectable donut slices with amount columns, so the central TODO
// tracks that reusable abstraction after this billing PR lands.

/** Selectable pie or donut card with a legend and optional filter hint. */
export default function PieChartCard(props: Props) {
  const { title, persistKey, data, colors, onSelect, selected } = props
  const { labelOf: customLabelOf, formatValue, centerLabel } = props
  const donut = Boolean(props.donut)
  const labelOf = chart.labelResolver(customLabelOf)
  const format = chart.valueFormatter(formatValue)
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const hasData = chart.hasChartData(data.length, total)
  const selectedLabel = chart.selectedLabelFor(selected, labelOf)
  let right
  if (onSelect) {
    right = <ChartFilterHint label={selectedLabel} onClear={chart.clearFilter(onSelect, selected)} />
  }
  const pieProps = chart.pieProps(data, donut, total, s.percentText)
  const showCenter = chart.hasCenterLabel(donut, centerLabel)
  if (!hasData) return <Panel collapsible persistKey={persistKey} title={title} right={right}><p className={s.empty}>{EMPTY_CHART_TEXT}</p></Panel>

  return (
    <Panel collapsible persistKey={persistKey} title={title} right={right}>
      <div className={s.row}>
        <div className={s.chartWrap}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie {...pieProps}>
              {data.map(d => <Cell key={d.name} {...chart.cellProps(d, colors, selected, onSelect, s.clickable)} />)}
            </Pie><Tooltip formatter={(value, name) => [format(Number(value)), labelOf(String(name))]} /></PieChart>
          </ResponsiveContainer>
          {showCenter && <div className={s.center}>{centerLabel}</div>}
        </div>
        <div className={s.legend} style={LEGEND_STYLE}>
          {data.map(d => <LegendItem key={d.name} {...chart.legendProps(d, labelOf, total, colors, formatValue)} />)}
        </div>
      </div>
    </Panel>
  )
}

// The module composes Panel, Recharts and the legend row into one selectable chart card.

import type { DotStyle, Props } from './types'
import s from './index.module.css'

// centinela-exime: familia-dispersa@5 — tried extracting the chart helper first; TODO tracks the shared legend pattern.
// centinela-exime: bloques-similares@6 — searched StatCard, Panel and chart rows; none matches this three-cell legend.
/** One row of a chart's legend: a color swatch, the name, the absolute figure and its share. */
export default function LegendItem(props: Props) {
  const { name, value, total, color, formatValue = String } = props
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const dotStyle: DotStyle = { '--dot': color }
  return (
    <>
      <span className={s.label}>
        <span className={s.dot} style={dotStyle} />
        <span className={s.name}>{name}</span>
      </span>
      <span className={s.value}>{formatValue(value)}</span>
      <span className={s.pct}>{pct}%</span>
    </>
  )
}

// PieChartCard owns the grid widths, while this row owns the three cells that fill that grid.

import type { CSSProperties } from 'react'
import s from './index.module.css'

// One legend row, drawn in three grid cells (hence the fragment, not its own box): swatch+name,
// absolute figure, percentage. Grouped in columns instead of one stacked line so the numbers line
// up down the column and the eye can compare them without re-reading the name each time.
type Props = {
  name: string
  value: number
  total: number
  color: string
  /** How the absolute figure is shown — a dollar total instead of cents, say. The percentage
   *  ALWAYS comes from the raw `value`, never from the formatted one. */
  formatValue?: (v: number) => string
}

/** One row of a chart's legend: a color swatch, the name, the absolute figure and its share. */
export default function LegendItem(props: Props) {
  const { name, value, total, color, formatValue = String } = props
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <>
      <span className={s.label}>
        <span className={s.dot} style={{ '--dot': color } as CSSProperties} />
        <span className={s.name}>{name}</span>
      </span>
      <span className={s.value}>{formatValue(value)}</span>
      <span className={s.pct}>{pct}%</span>
    </>
  )
}

// Absolute and percentage together were Federico's request (12/08/2026). The columns' own
// widths live in `PieChartCard`, which draws the grid these cells sit in — one contract, one file.

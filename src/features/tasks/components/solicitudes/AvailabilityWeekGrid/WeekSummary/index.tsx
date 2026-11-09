import type { WeekSummaryProps } from '../types'
import s from '../index.module.css'

/** The lines above the grid: the declared total and, when the member has no workday, the one
 *  notice saying so — once for the whole week instead of once per day. */
export default function WeekSummary({ summary }: WeekSummaryProps) {
  return <>
    <p className={s.summary}>{summary.total}</p>
    {summary.noJornada && <p className={s.noJornada}>{summary.noJornada}</p>}
  </>
}

// The notice sits beside the total, not instead of it: orphaned ranges still count as declared.

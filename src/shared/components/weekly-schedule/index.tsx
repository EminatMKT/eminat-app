import { HoursStatus, ListaRotulada } from '@/shared/components/ui'
import type { WeeklyScheduleProps } from './types'

/** Draws a week's worth of labeled lines, each with its ranges text and an hours-status badge —
 *  the generic shape behind any weekly schedule grid. Every string arrives already resolved; this
 *  component has no i18n or domain knowledge of its own. */
export default function WeeklySchedule({ totalText, lines }: WeeklyScheduleProps) {
  if (lines.length === 0) return totalText

  return (
    <>
      {totalText}
      {lines.map(line => (
        <ListaRotulada key={line.key} label={line.label}>
          {line.rangesText}
          <HoursStatus symbol={line.statusSymbol} tone={line.statusTone} text={line.statusText} />
        </ListaRotulada>
      ))}
    </>
  )
}

// Presentation-only: every string arrives already resolved by the caller, so this module never
// touches i18n or domain logic — only lays out the rows a weekly schedule is made of.

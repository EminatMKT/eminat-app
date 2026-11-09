import { useT } from '@/shared/i18n'
import {
  STATUS_COPY_KEYS,
  STATUS_SYMBOLS,
  compareDailyHours,
  comparisonCopyVars,
  declaredHoursByDay,
} from '@/features/tasks/utils/availability'
import { HoursStatus } from '@/shared/components/ui'
import type { DayCaptionProps } from './types'
import { DAY_CAPTION_CONSTANTS } from './constants'
import s from './index.module.css'

export default function DayCaption(props: DayCaptionProps) {
  const { day, ranges, expectedHours } = props
  const { t } = useT()
  const hoursByDay = declaredHoursByDay(ranges)
  const declaredHours = hoursByDay[day.weekday] ?? DAY_CAPTION_CONSTANTS.zeroHours
  const comparison = compareDailyHours(declaredHours, expectedHours)
  const comparisonVars = comparisonCopyVars(comparison)
  const comparisonText = t(STATUS_COPY_KEYS[comparison.status], comparisonVars)
  const label = t(day.labelKey)
  const hasJornada = expectedHours !== null

  return (
    <div className={s.root}>
      <span className={s.label}>{label}</span>
      {hasJornada && <HoursStatus
        symbol={STATUS_SYMBOLS[comparison.status]}
        text={comparisonText}
        tone={comparison.status}
      />}
    </div>
  )
}

// DayCaption carries the weekday label and the daily comparison DaySection already shows; the
// keyboard affordance to add a range now lives on the day's own track, not here. Without a
// jornada there is nothing to compare against: the grid states that once, not per day.

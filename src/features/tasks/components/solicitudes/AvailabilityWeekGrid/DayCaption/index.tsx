import { useT } from '@/shared/i18n'
import {
  STATUS_COPY_KEYS,
  STATUS_SYMBOLS,
  compareDailyHours,
  comparisonCopyVars,
  declaredHoursByDay,
} from '@/features/tasks/utils/availability'
import { HoursStatus } from '@/shared/components/ui'
import AddRangeControl from '../AddRangeControl'
import type { DayCaptionProps } from './types'
import { DAY_CAPTION_CONSTANTS } from './constants'
import s from './index.module.css'

export default function DayCaption(props: DayCaptionProps) {
  const { day, ranges, expectedHours, readOnly, onAdd } = props
  const { t } = useT()
  const hoursByDay = declaredHoursByDay(ranges)
  const declaredHours = hoursByDay[day.weekday] ?? DAY_CAPTION_CONSTANTS.zeroHours
  const comparison = compareDailyHours(declaredHours, expectedHours)
  const comparisonVars = comparisonCopyVars(comparison)
  const comparisonText = t(STATUS_COPY_KEYS[comparison.status], comparisonVars)
  const label = t(day.labelKey)

  return (
    <div className={s.root}>
      <span className={s.label}>{label}</span>
      <HoursStatus
        symbol={STATUS_SYMBOLS[comparison.status]}
        text={comparisonText}
        tone={comparison.status}
      />
      {!readOnly && <AddRangeControl day={day} ranges={ranges} onAdd={onAdd} />}
    </div>
  )
}

// DayCaption carries the weekday label, the daily comparison DaySection already shows, and -
// unless the grid is read-only- the keyboard affordance to add that day's next free range.

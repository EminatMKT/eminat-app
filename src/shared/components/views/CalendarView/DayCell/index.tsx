'use client'
import type { CalendarItem, CalendarViewProps } from '@/shared/components/views/types'
import Pressable from '@/shared/components/ui/Pressable'
import CalendarBox from '../CalendarBox'
import dateLabel from '../date-label'
import s from './index.module.css'

interface Props<T extends CalendarItem> extends Pick<CalendarViewProps<T>,
  'locale' | 'items' | 'renderItem' | 'onDaySelect' | 'onItemSelect' | 'emptyDayLabel'> {
  /** The square this cell is, as an ISO date-only string. */
  date: string
}

export default function DayCell<T extends CalendarItem>(props: Props<T>) {
  const { date, locale, items, renderItem } = props
  const { onDaySelect, onItemSelect, emptyDayLabel } = props
  return (
    <CalendarBox part="day">
      <Pressable accessibleLabel={dateLabel(date, locale).day} className={s.number}
        onClick={() => onDaySelect(date)}>{dateLabel(date, locale).number}</Pressable>
      {items.map((item) => (
        <Pressable key={item.id} accessibleLabel={item.accessibleLabel} className={s.record}
          onClick={() => onItemSelect(item.id)}>{renderItem(item)}</Pressable>
      ))}
      {items.length === 0 && emptyDayLabel(date)}
    </CalendarBox>
  )
}

// One square of the month page: the day, whatever landed on it, and what to say when nothing
// did. The records sit BESIDE the day control and not inside it — a button nested in a button
// leaves one of the two unreachable by keyboard, and the browser picks which.
//
// The cell draws the number and announces the whole date, because the column a cell sits in is
// the other half of its name on screen and a screen reader never sees a column. What an empty
// day says is the feature's line, not the view's: only the feature knows whether nothing there
// means free, closed or unpaid.

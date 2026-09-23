'use client'
import type { CalendarItem, CalendarViewProps } from '../types'
import buildMonthGrid from './month-grid'
import CalendarBox from './CalendarBox'
import DayCell from './DayCell'
import MonthNav from './MonthNav'

export default function CalendarView<T extends CalendarItem>(props: CalendarViewProps<T>) {
  const { month, items, locale, renderItem } = props
  const { onMonthChange, onDaySelect, onItemSelect, emptyDayLabel } = props
  return (
    <CalendarBox part="page">
      <MonthNav month={month} locale={locale} onMonthChange={onMonthChange} />
      <CalendarBox part="grid">
        {buildMonthGrid(month).map((day) => (
          <DayCell key={day} date={day} locale={locale} renderItem={renderItem}
            items={items.filter((one) => one.date === day)} emptyDayLabel={emptyDayLabel}
            onDaySelect={onDaySelect} onItemSelect={onItemSelect} />
        ))}
      </CalendarBox>
    </CalendarBox>
  )
}

// A month of anything. The view owns the page —which days it shows, where they sit, what is
// reachable by keyboard— and nothing else: it never groups, filters or authorizes, and it does
// not know what a record is. The feature hands it items with a date and a name, and gets back
// the day, the month or the id that was pressed.
//
// It is controlled on purpose. The month on screen is a prop, so the screen around it can put
// that month in a URL, share it with a list beside the calendar or restore it after a reload —
// none of which is possible once the month is a `useState` hidden in here.
//
// The days come from `month-grid` in whole weeks, so the page always shows a few days of the
// neighbouring months: a record on the 31st has to be visible from the page of the month that
// borrows it, and hiding those cells is how a calendar loses records at its own edges.

import { describe, it, expect } from 'vitest'
import type { CalendarItem, CalendarViewProps } from './index'

const entry: CalendarItem = { id: 'a1', date: '2026-09-14', accessibleLabel: 'Entry A' }

const props: CalendarViewProps<CalendarItem> = {
  month: '2026-09-01',
  items: [entry],
  locale: 'en-US',
  renderItem: (item) => item.accessibleLabel,
  onMonthChange: () => undefined,
  onDaySelect: () => undefined,
  onItemSelect: () => undefined,
  emptyDayLabel: (date) => `Nothing on ${date}`,
}

describe('calendar view contracts', () => {
  it('identifies an item by id, places it by ISO day and names it for a screen reader', () => {
    expect(Object.keys(entry)).toEqual(['id', 'date', 'accessibleLabel'])
  })

  // The point of the contract: nothing domain-shaped crosses into the view. What a record
  // looks like and what an empty day says both arrive as functions the feature owns.
  it('leaves every domain decision to a callback', () => {
    expect(props.renderItem(entry)).toBe('Entry A')
    expect(props.emptyDayLabel('2026-09-15')).toBe('Nothing on 2026-09-15')
  })

  it('takes the displayed month as the first day of that month', () => {
    expect(props.month.endsWith('-01')).toBe(true)
  })
})

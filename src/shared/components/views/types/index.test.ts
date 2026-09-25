import { describe, it, expect } from 'vitest'
import type { CalendarItem, CalendarViewProps } from './index'

const entry: CalendarItem = { id: 'a1', date: '2026-09-14', label: 'Entry A', accessibleLabel: 'Entry A, Sep 14' }

const props: CalendarViewProps<CalendarItem> = {
  period: '2026-09-01',
  mode: 'month',
  items: [entry],
  locale: 'en-US',
  onPeriodChange: () => undefined,
  onDaySelect: () => undefined,
  onItemSelect: () => undefined,
  moreLabel: (hidden) => `+${hidden} more`,
  lessLabel: 'Show less',
}

describe('calendar view contracts', () => {
  it('identifies an item by id, places it by ISO day, draws a short label and names it in full', () => {
    expect(Object.keys(entry)).toEqual(['id', 'date', 'label', 'accessibleLabel'])
  })

  // The point of the contract: nothing domain-shaped crosses into the view. What the overflow
  // of a full day says arrives from the feature, in the feature's words.
  it('leaves every word to the feature', () => {
    expect(props.moreLabel(3)).toBe('+3 more')
  })

  // The range on screen is a period and a mode, not a month: the view can learn a week or a day
  // without the feature's props changing shape.
  it('takes the displayed period as its first day, and the mode that reads it', () => {
    expect(props.period.endsWith('-01')).toBe(true)
    expect(props.mode).toBe('month')
  })
})

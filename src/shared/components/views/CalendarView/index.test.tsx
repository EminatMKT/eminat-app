import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type Pressable from '@/shared/components/ui/Pressable'
import type { CalendarItem, CalendarViewProps } from '../types'
import CalendarView from './index'

// No DOM here: every day starts folded, which is what `useState` answers, and every control
// records the props it was drawn with. Pressing one is calling its `onClick`, which is what a
// mouse click and an Enter on a focused button both end up doing.
const { controls } = vi.hoisted(() => ({ controls: new Array<ComponentProps<typeof Pressable>>() }))
vi.mock('react', async (original) => ({ ...await original<object>(), useState: (first: unknown) => [first, () => undefined] }))
vi.mock('@/shared/components/ui/Pressable', () => ({
  default: (props: ComponentProps<typeof Pressable>) => { controls.push(props); return props.children },
}))

const item = (id: string, date: string): CalendarItem => ({ id, date, label: `Entry ${id}`, accessibleLabel: `Entry ${id}` })
const items = [item('A', '2026-09-14'), item('B', '2026-09-14'), item('C', '2026-08-31')]
const picked: string[] = []
const props: CalendarViewProps<CalendarItem> = {
  period: '2026-09-01', mode: 'month', items, locale: 'en-US', today: '2026-09-15',
  onPeriodChange: (period) => { picked.push(period) },
  onDaySelect: (date) => { picked.push(date) },
  onItemSelect: (id) => { picked.push(id) },
  moreLabel: (hidden) => `+${hidden} more`, lessLabel: 'Show less',
}
const draw = (period: string) => {
  controls.length = 0
  const html = renderToStaticMarkup(<CalendarView {...props} period={period} />)
  return { html, drawn: [...controls] }
}
const press = (period: string, name: string) => {
  const { drawn } = draw(period)
  const control = drawn.find((one) => one.accessibleLabel.includes(name))
  control?.onClick()
  return control
}

describe('CalendarView', () => {
  beforeEach(() => { picked.length = 0 })

  it('reaches the borrowed days of the months on either side', () => {
    press('2026-09-01', 'August 30')
    press('2026-09-01', 'October 3')
    expect(picked).toEqual(['2026-08-30', '2026-10-03'])
  })

  it('draws every day of a leap February', () => {
    expect(press('2024-02-01', 'February 29')).toBeDefined()
  })

  // The arrows answer with the next period of the mode, never with a month the view picked.
  it('moves by one period in both directions, across the year boundary', () => {
    press('2026-12-01', 'January 2027')
    press('2026-12-01', 'November 2026')
    expect(picked).toEqual(['2027-01-01', '2026-11-01'])
  })

  it('stacks the items that land on the same day and reports the one pressed', () => {
    const { html } = draw('2026-09-01')
    expect(html).toContain('Entry A')
    expect(html).toContain('Entry B')
    picked.length = 0
    press('2026-09-01', 'Entry B')
    expect(picked).toEqual(['B'])
  })

  it('marks the day the caller calls today, and only that one', () => {
    const marked = draw('2026-09-01').drawn.filter((one) => one.current)
    expect(marked.map((one) => one.accessibleLabel)).toEqual(['Tuesday, September 15, 2026'])
  })

  // A record button inside a day button would be a button inside a button: the browser keeps
  // one of them and the inner one stops answering the keyboard. Every control draws plain text,
  // so none of them holds another.
  it('keeps days and items separately reachable by keyboard', () => {
    const { drawn } = draw('2026-09-01')
    expect(drawn.every((one) => typeof one.children === 'string')).toBe(true)
    expect(drawn.length).toBeGreaterThan(items.length)
  })
})

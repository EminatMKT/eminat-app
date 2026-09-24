import { describe, it, expect, beforeEach } from 'vitest'
import { isValidElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BUTTON } from '@/shared/constants/dom'
import type { CalendarItem } from '../types'
import CalendarView from './index'

type Drawn = ReactElement<Record<string, unknown>>
const ARIA = 'aria-label'
const items: CalendarItem[] = [
  { id: 'a', date: '2026-09-14', accessibleLabel: 'Entry A' },
  { id: 'b', date: '2026-09-14', accessibleLabel: 'Entry B' },
  { id: 'c', date: '2026-08-31', accessibleLabel: 'Entry C' },
]
const picked: string[] = []
const props = {
  month: '2026-09-01',
  items,
  locale: 'en-US',
  renderItem: (item: CalendarItem) => item.accessibleLabel,
  onMonthChange: (month: string) => picked.push(month),
  onDaySelect: (date: string) => picked.push(date),
  onItemSelect: (id: string) => picked.push(id),
  emptyDayLabel: (date: string) => `Free ${date}`,
}

// Vitest runs without a DOM here, so the tree is walked as React data: each component is called
// with its props and what it returns is collected. Pressing a control is calling its `onClick`,
// which is what a mouse click and an Enter on a focused button both end up doing.
const walk = (node: unknown, out: Drawn[]): Drawn[] => {
  if (Array.isArray(node)) return node.reduce<Drawn[]>((all, each) => walk(each, all), out)
  if (!isValidElement(node)) return out
  const drawn = node as Drawn
  out.push(drawn)
  const kind = drawn.type
  const inner = typeof kind === 'function' ? (kind as (p: unknown) => unknown)(drawn.props) : drawn.props.children
  return walk(inner, out)
}
const controls = (month: string) =>
  walk(CalendarView({ ...props, month }), []).filter((one) => one.type === BUTTON)
const named = (month: string, name: string) =>
  controls(month).find((one) => String(one.props[ARIA] ?? '').includes(name))
const press = (month: string, name: string) => (named(month, name)?.props.onClick as () => void)?.()

describe('CalendarView', () => {
  beforeEach(() => { picked.length = 0 })

  it('reaches the borrowed days of the months on either side', () => {
    press('2026-09-01', 'August 30')
    press('2026-09-01', 'October 3')
    expect(picked).toEqual(['2026-08-30', '2026-10-03'])
  })

  it('draws every day of a leap February', () => {
    expect(named('2024-02-01', 'February 29')).toBeDefined()
  })

  it('steps across the year boundary in both directions', () => {
    press('2026-12-01', 'January 2027')
    press('2026-12-01', 'November 2026')
    expect(picked).toEqual(['2027-01-01', '2026-11-01'])
  })

  it('stacks the items that land on the same day and reports the one pressed', () => {
    const html = renderToStaticMarkup(<CalendarView {...props} />)
    expect(html).toContain('Entry A')
    expect(html).toContain('Entry B')
    press('2026-09-01', 'Entry B')
    expect(picked).toEqual(['b'])
  })

  it('says what an empty day is, in the words the feature gave it', () => {
    expect(renderToStaticMarkup(<CalendarView {...props} />)).toContain('Free 2026-09-15')
  })

  // A record button inside a day button would be a button inside a button: the browser keeps
  // one of them and the inner one stops answering the keyboard. They are siblings instead.
  it('keeps days and items separately reachable by keyboard', () => {
    const nested = controls('2026-09-01').some((one) => walk(one.props.children, []).some((kid) => kid.type === BUTTON))
    expect(nested).toBe(false)
    expect(controls('2026-09-01').length).toBeGreaterThan(items.length)
  })
})

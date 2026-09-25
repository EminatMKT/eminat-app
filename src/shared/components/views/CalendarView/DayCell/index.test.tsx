import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CalendarItem } from '@/shared/components/views/types'
import type Pressable from '@/shared/components/ui/Pressable'
import type CalendarBox from '../CalendarBox'
import DayCell from './index'

// No DOM here. The fold of the day is read from `day` and its setter records the call; every
// control and box records what it was drawn with, and a control draws nothing of its own.
const { day, toggled, controls, boxes } = vi.hoisted(() => ({
  day: { open: false }, toggled: new Array<boolean>(),
  controls: new Array<ComponentProps<typeof Pressable>>(), boxes: new Array<string>(),
}))
vi.mock('react', async (original) => ({
  ...await original<object>(), useState: () => [day.open, (next: boolean) => { toggled.push(next) }],
}))
vi.mock('@/shared/components/ui/Pressable', () => ({
  default: (control: ComponentProps<typeof Pressable>) => { controls.push(control); return null },
}))
vi.mock('../CalendarBox', () => ({
  default: ({ part, children }: ComponentProps<typeof CalendarBox>) => { boxes.push(part); return children },
}))

const LONG = 'A'.repeat(466)
const entry = (id: string, label = `Entry ${id}`): CalendarItem => ({ id, date: '2026-09-14', label, accessibleLabel: `Payment · ${label}` })
const many = (count: number) => Array.from({ length: count }, (_, i) => entry(`n${i}`))
const picked: string[] = []
const props = {
  date: '2026-09-14', locale: 'en-US', items: [entry('a'), entry('b')], lessLabel: 'Show less',
  onDaySelect: (date: string) => picked.push(date), onItemSelect: (id: string) => picked.push(id),
  moreLabel: (hidden: number) => `+${hidden} more`,
}
const draw = (items: CalendarItem[]) => {
  controls.length = 0
  boxes.length = 0
  const html = renderToStaticMarkup(<DayCell {...props} items={items} />)
  return { html, drawn: [...controls], last: controls[controls.length - 1] }
}

describe('DayCell', () => {
  beforeEach(() => { picked.length = 0; toggled.length = 0; day.open = false })

  // The records are siblings of the day, never inside it: a button within a button loses one of
  // the two for the keyboard, and which one is lost is up to the browser.
  it('puts the day and each record within reach side by side, and hands back what was pressed', () => {
    const [cell, first] = draw(props.items).drawn
    cell.onClick()
    first.onClick()
    expect(picked).toEqual(['2026-09-14', 'a'])
    expect(cell.accessibleLabel).toBe('Monday, September 14, 2026')
  })

  // A chip is one line cut by the stylesheet; the pointer and the screen reader get it whole.
  it('draws the short label on the chip and gives the whole text to hover and to the reader', () => {
    const [, chip] = draw([entry('long', LONG)]).drawn
    expect(chip.children).toBe(LONG)
    expect(chip.hint).toBe(`Payment · ${LONG}`)
    expect(chip.accessibleLabel).toBe(chip.hint)
  })

  // An empty day is the grid's default state; a line in every empty cell was only noise.
  it('draws nothing on an empty day but the control with its number', () => {
    const { html, drawn } = draw([])
    expect(html).toBe('')
    expect(drawn.map(({ children }) => children)).toEqual(['14'])
  })

  // The cell has room for three rows, so a full day draws two records and the count of the rest;
  // open, it draws them all inside the same cell, which scrolls, and the control stays put.
  it('keeps a folded day at three rows however many records land on it, and counts the rest', () => {
    for (let count = 0; count <= 12; count++) expect(draw(many(count)).drawn.length - 1).toBeLessThanOrEqual(3)
    const { last } = draw(many(10))
    expect(last.accessibleLabel).toBe('+8 more')
    last.onClick()
    expect(toggled).toEqual([true])
  })

  it('draws every record of an open day in a scrolling list, and offers to fold it back', () => {
    day.open = true
    expect(draw(many(10)).drawn).toHaveLength(12)
    expect(boxes).toEqual(['day', 'open'])
    expect(draw(many(10)).last.accessibleLabel).toBe('Show less')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { isValidElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CalendarItem } from '@/shared/components/views/types'
import DayCell from './index'

type Control = ReactElement<{ accessibleLabel: string; onClick: () => void }>
const picked: string[] = []
const items: CalendarItem[] = [
  { id: 'a', date: '2026-09-14', accessibleLabel: 'Entry A' },
  { id: 'b', date: '2026-09-14', accessibleLabel: 'Entry B' },
]
const props = {
  date: '2026-09-14',
  locale: 'en-US',
  items,
  renderItem: (item: CalendarItem) => item.accessibleLabel,
  onDaySelect: (date: string) => picked.push(date),
  onItemSelect: (id: string) => picked.push(id),
  emptyDayLabel: (date: string) => `Free ${date}`,
}
const controls = (): Control[] => {
  const cell = DayCell(props) as ReactElement<{ children: unknown[] }>
  return cell.props.children.flat().filter(isValidElement) as Control[]
}

describe('DayCell', () => {
  beforeEach(() => { picked.length = 0 })

  // The records are siblings of the day, never inside it: a button within a button loses one of
  // the two for the keyboard, and which one is lost is up to the browser.
  it('puts the day and each of its records within reach, side by side', () => {
    expect(controls()).toHaveLength(items.length + 1)
  })

  it('hands back the day it was pressed on, and the id of the record', () => {
    const [day, first] = controls()
    day.props.onClick()
    first.props.onClick()
    expect(picked).toEqual(['2026-09-14', 'a'])
  })

  it('names the day in full, and draws only its number', () => {
    const [day] = controls()
    expect(day.props.accessibleLabel).toBe('Monday, September 14, 2026')
    expect(renderToStaticMarkup(<DayCell {...props} />)).toContain('>14<')
  })

  it('says what the feature calls an empty day, and only when it is empty', () => {
    expect(renderToStaticMarkup(<DayCell {...props} items={[]} />)).toContain('Free 2026-09-14')
    expect(renderToStaticMarkup(<DayCell {...props} />)).not.toContain('Free')
  })
})

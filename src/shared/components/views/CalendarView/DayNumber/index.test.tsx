import { describe, it, expect, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type Pressable from '@/shared/components/ui/Pressable'
import DayNumber from './index'

const { controls } = vi.hoisted(() => ({ controls: new Array<ComponentProps<typeof Pressable>>() }))
vi.mock('@/shared/components/ui/Pressable', () => ({
  default: (control: ComponentProps<typeof Pressable>) => { controls.push(control); return null },
}))
vi.mock('../DayCell/index.module.css', () => ({ default: { number: 'number', today: 'today' } }))

const picked: string[] = []
const draw = (today: boolean) => {
  controls.length = 0
  renderToStaticMarkup(<DayNumber date="2026-09-14" locale="en-US" today={today} onDaySelect={(day) => picked.push(day)} />)
  return controls[0]
}

describe('DayNumber', () => {
  // The cell draws its number and announces the whole date, and a press starts on that date.
  it('draws the number, names the whole date and hands it back when pressed', () => {
    const cell = draw(false)
    cell.onClick()
    expect([cell.children, cell.accessibleLabel, picked]).toEqual(['14', 'Monday, September 14, 2026', ['2026-09-14']])
  })

  // Today is marked for the eye and for the screen reader; any other day is neither.
  it('marks today with its own look and aria-current, and no other day', () => {
    expect([draw(true).className, draw(true).current]).toEqual(['number today', 'date'])
    expect([draw(false).className, draw(false).current]).toEqual(['number', undefined])
  })
})

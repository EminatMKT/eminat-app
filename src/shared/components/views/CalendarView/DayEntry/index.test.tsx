import { describe, it, expect, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CalendarItem } from '@/shared/components/views/types'
import type Pressable from '@/shared/components/ui/Pressable'
import DayEntry from './index'

const { controls } = vi.hoisted(() => ({ controls: new Array<ComponentProps<typeof Pressable>>() }))
vi.mock('@/shared/components/ui/Pressable', () => ({
  default: (control: ComponentProps<typeof Pressable>) => { controls.push(control); return null },
}))
vi.mock('../DayCell/index.module.css', () => ({ default: { entry: 'entry', done: 'done' } }))

const open: CalendarItem = { id: 'a', date: '2026-09-14', label: 'Rent', accessibleLabel: 'Payment · Rent · Pending' }
const picked: string[] = []
const draw = (item: CalendarItem) => {
  controls.length = 0
  renderToStaticMarkup(<DayEntry item={item} onItemSelect={(id) => picked.push(id)} />)
  return controls[0]
}

describe('DayEntry', () => {
  // The chip cuts its label; the pointer and the screen reader get the whole record.
  it('draws the short label and hands back the id when pressed', () => {
    const chip = draw(open)
    chip.onClick()
    expect([chip.children, chip.hint, chip.accessibleLabel, picked]).toEqual(['Rent', open.accessibleLabel, open.accessibleLabel, ['a']])
  })

  // What is settled looks settled: a different skin, and the words stay the caller's.
  it('wears the look of its tone on top of the chip, and no other when it has none', () => {
    expect(draw(open).className).toBe('entry')
    expect(draw({ ...open, tone: 'done' }).className).toBe('entry done')
  })
})

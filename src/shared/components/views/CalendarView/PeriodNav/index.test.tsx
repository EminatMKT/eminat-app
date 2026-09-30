import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type Pressable from '@/shared/components/ui/Pressable'
import PeriodNav from './index'

// Each arrow records the props it was drawn with, so a test presses it without a DOM.
const { arrows } = vi.hoisted(() => ({ arrows: new Array<ComponentProps<typeof Pressable>>() }))
vi.mock('@/shared/components/ui/Pressable', () => ({
  default: (props: ComponentProps<typeof Pressable>) => { arrows.push(props); return props.children },
}))

const picked: string[] = []
const pick = (period: string) => { picked.push(period) }
const draw = (period: string) =>
  renderToStaticMarkup(<PeriodNav period={period} mode="month" locale="en-US" onPeriodChange={pick} />)

describe('PeriodNav', () => {
  beforeEach(() => { arrows.length = 0; picked.length = 0 })

  // An arrow whose name is "previous" says nothing out loud twice in a row. Naming it after
  // where it lands is also what tells a test which of the two it is holding.
  it('names each arrow after the period it reaches, year included', () => {
    draw('2026-12-01')
    const [back, forward] = arrows
    expect(back.accessibleLabel).toBe('November 2026')
    expect(forward.accessibleLabel).toBe('January 2027')
  })

  // In month mode one step is one month, across the year boundary in both directions.
  it('moves by one period of its mode', () => {
    draw('2026-12-01')
    const [back, forward] = arrows
    back.onClick()
    forward.onClick()
    expect(picked).toEqual(['2026-11-01', '2027-01-01'])
  })

  it('says which period is on screen', () => {
    expect(draw('2026-09-01')).toContain('September 2026')
  })

  it('offers no jump-to-today control when it is not given a today or a label', () => {
    draw('2026-09-01')
    expect(arrows).toHaveLength(2)
  })

  it('offers a jump-to-today control, landing on the period today falls in', () => {
    renderToStaticMarkup(
      <PeriodNav period="2026-08-01" mode="month" locale="en-US" onPeriodChange={pick} today="2026-09-23" todayLabel="Today" />,
    )
    expect(arrows).toHaveLength(3)
    arrows[0].onClick()
    expect(picked).toEqual(['2026-09-01'])
  })

  it('hides the jump-to-today control once the period on screen already is today\'s', () => {
    renderToStaticMarkup(
      <PeriodNav period="2026-09-01" mode="month" locale="en-US" onPeriodChange={pick} today="2026-09-23" todayLabel="Today" />,
    )
    expect(arrows).toHaveLength(2)
  })
})

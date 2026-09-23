import { describe, it, expect } from 'vitest'
import { isValidElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MonthNav from './index'

type Step = ReactElement<{ accessibleLabel: string; onClick: () => void }>
const ignore = () => undefined
const arrows = (month: string, onMonthChange: (month: string) => void): Step[] => {
  const bar = MonthNav({ month, locale: 'en-US', onMonthChange }) as ReactElement<{ children: unknown[] }>
  return bar.props.children.filter(isValidElement) as Step[]
}

describe('MonthNav', () => {
  // An arrow whose name is "previous" says nothing out loud twice in a row. Naming it after
  // where it lands is also what tells a test which of the two it is holding.
  it('names each arrow after the month it reaches, year included', () => {
    const [back, forward] = arrows('2026-12-01', ignore)
    expect(back.props.accessibleLabel).toBe('November 2026')
    expect(forward.props.accessibleLabel).toBe('January 2027')
  })

  it('steps across the year boundary in both directions', () => {
    const picked: string[] = []
    const [back, forward] = arrows('2026-12-01', (month) => picked.push(month))
    back.props.onClick()
    forward.props.onClick()
    expect(picked).toEqual(['2026-11-01', '2027-01-01'])
  })

  it('says which month is on screen', () => {
    const bar = <MonthNav month="2026-09-01" locale="en-US" onMonthChange={ignore} />
    expect(renderToStaticMarkup(bar)).toContain('September 2026')
  })
})

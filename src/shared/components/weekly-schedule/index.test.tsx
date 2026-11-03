import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { WeeklyScheduleLine } from './types'
import WeeklySchedule from './index'

const TOTAL_TEXT = 'Declared 16h this week'

const mondayLine: WeeklyScheduleLine = {
  key: 'monday',
  label: 'Monday',
  rangesText: '09:00–13:00',
  statusSymbol: '✓',
  statusTone: 'complete',
  statusText: 'On target',
}
const tuesdayLine: WeeklyScheduleLine = {
  key: 'tuesday',
  label: 'Tuesday',
  rangesText: '10:00–14:00',
  statusSymbol: '↓',
  statusTone: 'below',
  statusText: 'Below target',
}
const wednesdayLine: WeeklyScheduleLine = {
  key: 'wednesday',
  label: 'Wednesday',
  rangesText: '08:00–17:00',
  statusSymbol: '↑',
  statusTone: 'above',
  statusText: 'Above target',
}
const exampleLines = [mondayLine, tuesdayLine, wednesdayLine]

const draw = (lines: WeeklyScheduleLine[]) =>
  renderToStaticMarkup(<WeeklySchedule totalText={TOTAL_TEXT} lines={lines} />)

describe('WeeklySchedule', () => {
  it('renders each line label, ranges and status text alongside the total', () => {
    const html = draw(exampleLines)

    expect(html).toContain(TOTAL_TEXT)

    for (const line of exampleLines) {
      expect(html).toContain(line.label)
      expect(html).toContain(line.rangesText)
      expect(html).toContain(line.statusText)
    }
  })

  it('still shows the total text when there are no lines, without stray markup', () => {
    const html = draw([])

    expect(html).toBe(TOTAL_TEXT)
  })
})

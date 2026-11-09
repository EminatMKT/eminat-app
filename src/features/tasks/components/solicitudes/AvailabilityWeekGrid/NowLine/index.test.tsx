import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { NowLineProps } from './types'
import NowLine from '.'

// The clock is swapped for a reading each case sets, so no test depends on the real time.
// Named via vi.hoisted so the path exists before Vitest hoists the vi.mock call below it.
const { USE_NOW_MODULE, readNow } = vi.hoisted(() => ({
  USE_NOW_MODULE: './use-now',
  readNow: (): Date | null => reading,
}))

vi.mock(USE_NOW_MODULE, () => ({ default: readNow }))

let reading: Date | null = null

// No trailing `Z`: the stamp parses as local time, so the weekday holds in any time zone.
const MONDAY_NINE_AM = '2026-11-09T09:00:00'
const EMPTY_MARKUP = ''
const MONDAY_COLUMN: NowLineProps = { weekday: 1 }
const TUESDAY_COLUMN: NowLineProps = { weekday: 2 }
// 9:00 = 540 min × 0.75 px/min = 405px, the top of the 09 hour row.
const EXPECTED_FRAGMENTS: string[] = ['data-now-line', '--now-top:405px', 'aria-hidden="true"']

describe('NowLine', () => {
  it('draws nothing before the clock has been read', () => {
    reading = null

    expect(renderToStaticMarkup(<NowLine {...MONDAY_COLUMN} />)).toBe(EMPTY_MARKUP)
  })

  it('draws a decorative line at the current minute on today column', () => {
    reading = new Date(MONDAY_NINE_AM)
    const html = renderToStaticMarkup(<NowLine {...MONDAY_COLUMN} />)

    for (const fragment of EXPECTED_FRAGMENTS) expect(html).toContain(fragment)
  })

  it('draws nothing on any other day column', () => {
    reading = new Date(MONDAY_NINE_AM)

    expect(renderToStaticMarkup(<NowLine {...TUESDAY_COLUMN} />)).toBe(EMPTY_MARKUP)
  })
})

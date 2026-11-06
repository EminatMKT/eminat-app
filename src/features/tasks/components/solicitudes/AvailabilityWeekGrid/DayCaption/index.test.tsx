import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  AVAILABILITY_DAYS,
  STATUS_COPY_KEYS,
  STATUS_SYMBOLS,
} from '@/features/tasks/utils/availability'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { DayCaptionProps } from './types'
import DayCaption from './index'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const MONDAY = AVAILABILITY_DAYS[0]
const EXPECTED_HOURS = 8
const BELOW_HOURS = 6
const START_TIME = '09:00'
const END_TIME = '17:00'
const SHORT_END_TIME = '15:00'
const NO_RANGES: WeeklyAvailabilityRange[] = []
const NO_OVERRIDES: Partial<DayCaptionProps> = {}

const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => ({
  weekday: MONDAY.weekday,
  startsAt,
  endsAt,
})

const buildProps = (
  ranges: WeeklyAvailabilityRange[],
  expectedHours: number | null,
  overrides: Partial<DayCaptionProps> = NO_OVERRIDES,
): DayCaptionProps => ({
  day: MONDAY,
  ranges,
  expectedHours,
  ...overrides,
})

const draw = (props: DayCaptionProps) => renderToStaticMarkup(<DayCaption {...props} />)

describe('DayCaption', () => {
  it('renders the translated weekday label', () => {
    const html = draw(buildProps(NO_RANGES, EXPECTED_HOURS))

    expect(html).toContain(MONDAY.labelKey)
  })

  it('renders the below, complete, above, and unavailable comparison text', () => {
    const belowHtml = draw(buildProps([range(START_TIME, SHORT_END_TIME)], EXPECTED_HOURS))
    const completeHtml = draw(buildProps([range(START_TIME, END_TIME)], EXPECTED_HOURS))
    const aboveHtml = draw(buildProps([range(START_TIME, END_TIME)], BELOW_HOURS))
    const unavailableHtml = draw(buildProps([range(START_TIME, SHORT_END_TIME)], null))

    expect(belowHtml).toContain(STATUS_COPY_KEYS.below)
    expect(completeHtml).toContain(STATUS_COPY_KEYS.complete)
    expect(aboveHtml).toContain(STATUS_COPY_KEYS.above)
    expect(unavailableHtml).toContain(STATUS_COPY_KEYS.unavailable)
  })

  it('renders the status symbol alongside the text, never as the only signal', () => {
    const html = draw(buildProps([range(START_TIME, END_TIME)], EXPECTED_HOURS))

    expect(html).toContain(STATUS_SYMBOLS.complete)
    expect(html).toContain(STATUS_COPY_KEYS.complete)
  })

  it('treats a missing jornada reference as unavailable, not a crash', () => {
    const html = draw(buildProps([range(START_TIME, END_TIME)], null))

    expect(html).toContain(STATUS_COPY_KEYS.unavailable)
    expect(html).toContain(STATUS_SYMBOLS.unavailable)
  })

  it('still renders the comparison for a day with zero declared ranges', () => {
    const html = draw(buildProps(NO_RANGES, EXPECTED_HOURS))

    expect(html).toContain(STATUS_COPY_KEYS.below)
  })
})

// Defines DayCaption's visible contract: the weekday label and the symbol-and-text daily
// comparison DaySection already shows. The keyboard add-range affordance it used to compose
// now lives on the day's own track; GridDay/track-keydown and its test cover that path.

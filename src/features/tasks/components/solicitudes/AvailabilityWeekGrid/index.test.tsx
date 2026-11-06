import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { LocaleProvider, translate } from '@/shared/i18n'
import {
  AVAILABILITY_DAYS,
  STATUS_COPY_KEYS,
  compareDailyHours,
  comparisonCopyVars,
  declaredWeeklyHours,
} from '@/features/tasks/utils/availability'
import type { EditableRange } from '../WeeklyAvailabilityEditor/component-types'
import EDITOR_COPY from '../WeeklyAvailabilityEditor/constants'
import { BLOCK_LABEL_READ_ONLY_KEY } from './Block/constants'
import type { AvailabilityWeekGridProps } from './types'
import AvailabilityWeekGrid from './index'

const RANGE: EditableRange = {
  clientId: 'test-range',
  weekday: 1,
  startsAt: EDITOR_COPY.defaultStart,
  endsAt: EDITOR_COPY.defaultEnd,
  note: null,
}
const TUESDAY_RANGE: EditableRange = {
  ...RANGE,
  clientId: 'tuesday-range',
  weekday: 2,
  endsAt: '19:00',
}
const HOURS_PER_DAY = 8
const NOOP = () => undefined
const GUTTER_MARKER = 'data-grid-gutter'
const DAY_MARKER = /data-grid-day=/g
const EXPECTED_COLUMNS = 7
const EXPECTED_BLOCKS = 2
const EXPECTED_RESIZE_HANDLES = 2
const ZERO_HOURS = 0
const TUESDAY_HOURS = 10
const EXPECTED_WEEKLY_HOURS = 18
const DEFAULT_LOCALE = 'es'
const INVENTED_WEEKLY_TARGET = '40 horas'
const RESIZE_HANDLE_MARKER = /data-resize-handle="true"/g
const BLOCK_BUTTON_MARKER = /<button\b/g
const FOCUSABLE_TRACK_MARKER = /tabindex="0"/g
const props: AvailabilityWeekGridProps = {
  ranges: [RANGE],
  workday: { id: 'test-workday', name: 'Standard', hoursPerDay: HOURS_PER_DAY },
  readOnly: false,
  onChange: NOOP,
}
const draw = (gridProps: AvailabilityWeekGridProps) => renderToStaticMarkup(
  <LocaleProvider><AvailabilityWeekGrid {...gridProps} /></LocaleProvider>,
)

it('renders seven ISO day columns and a time gutter', () => {
  const html = draw(props)

  expect(html.match(DAY_MARKER)).toHaveLength(EXPECTED_COLUMNS)
  expect(html).toContain(GUTTER_MARKER)

  for (const day of AVAILABILITY_DAYS) {
    const label = translate(DEFAULT_LOCALE, day.labelKey)

    expect(html).toContain(label)
  }
})

it('places each supplied range as a distinct time block', () => {
  const ranges = [RANGE, TUESDAY_RANGE]
  const html = draw({ ...props, ranges })
  const mondayTime = `${RANGE.startsAt}–${RANGE.endsAt}`
  const tuesdayTime = `${TUESDAY_RANGE.startsAt}–${TUESDAY_RANGE.endsAt}`

  expect(html).toContain(mondayTime)
  expect(html).toContain(tuesdayTime)
  expect(html.match(BLOCK_BUTTON_MARKER)).toHaveLength(EXPECTED_BLOCKS)
})

it('offers a keyboard-focusable track for every day and resize handles for editable blocks', () => {
  const html = draw(props)

  expect(html.match(RESIZE_HANDLE_MARKER)).toHaveLength(EXPECTED_RESIZE_HANDLES)
  expect(html.match(FOCUSABLE_TRACK_MARKER)).toHaveLength(EXPECTED_COLUMNS)

  for (const day of AVAILABILITY_DAYS) {
    const hintVars = { day: translate(DEFAULT_LOCALE, day.labelKey) }
    const hint = translate(DEFAULT_LOCALE, EDITOR_COPY.addRangeHint, hintVars)

    expect(html).toContain(hint)
  }
})

it('keeps blocks focusable for viewing but suppresses editing controls when read-only', () => {
  const readOnlyProps = { ...props, readOnly: true }
  const html = draw(readOnlyProps)
  const labelVars = { time: `${RANGE.startsAt}–${RANGE.endsAt}`, note: RANGE.note ?? '' }
  const readOnlyLabel = translate(DEFAULT_LOCALE, BLOCK_LABEL_READ_ONLY_KEY, labelVars)

  expect(html).toContain(readOnlyLabel)
  expect(html.match(BLOCK_BUTTON_MARKER)).toHaveLength(1)
  expect(html.match(RESIZE_HANDLE_MARKER)).toBeNull()
  expect(html.match(FOCUSABLE_TRACK_MARKER)).toBeNull()
})

it('shows daily comparisons against the configured hours, including empty days', () => {
  const ranges = [RANGE, TUESDAY_RANGE]
  const html = draw({ ...props, ranges })
  const complete = compareDailyHours(HOURS_PER_DAY, HOURS_PER_DAY)
  const above = compareDailyHours(TUESDAY_HOURS, HOURS_PER_DAY)
  const below = compareDailyHours(ZERO_HOURS, HOURS_PER_DAY)
  const completeText = translate(
    DEFAULT_LOCALE, STATUS_COPY_KEYS.complete, comparisonCopyVars(complete),
  )
  const aboveText = translate(DEFAULT_LOCALE, STATUS_COPY_KEYS.above, comparisonCopyVars(above))
  const belowText = translate(DEFAULT_LOCALE, STATUS_COPY_KEYS.below, comparisonCopyVars(below))

  expect(html).toContain(completeText)
  expect(html).toContain(aboveText)
  expect(html).toContain(belowText)
})

it('explains an empty week while keeping seven usable columns', () => {
  const emptyProps = { ...props, ranges: [] }
  const html = draw(emptyProps)
  const message = translate(DEFAULT_LOCALE, EDITOR_COPY.emptyDay)

  expect(html).toContain(message)
  expect(html.match(DAY_MARKER)).toHaveLength(EXPECTED_COLUMNS)
})

it('shows the declared weekly total without inventing a weekly target', () => {
  const ranges = [RANGE, TUESDAY_RANGE]
  const html = draw({ ...props, ranges })
  const summaryVars = { hours: EXPECTED_WEEKLY_HOURS }
  const summary = translate(DEFAULT_LOCALE, EDITOR_COPY.weeklyHoursKey, summaryVars)

  expect(declaredWeeklyHours(ranges)).toBe(EXPECTED_WEEKLY_HOURS)
  expect(html).toContain(summary)
  expect(html).not.toContain(INVENTED_WEEKLY_TARGET)
})

import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { LocaleProvider, translate } from '@/shared/i18n'
import { AVAILABILITY_DAYS, declaredWeeklyHours } from '@/features/tasks/utils/availability'
import type { EditableRange } from '../WeeklyAvailabilityEditor/component-types'
import EDITOR_COPY from '../WeeklyAvailabilityEditor/constants'
import { BLOCK_LABEL_READ_ONLY_KEY } from './Block/constants'
import { HOURS_STATUS_MARKER } from './DayCaption/constants'
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
const HOURS_PER_WEEK = 40
const NOOP = () => undefined
const GUTTER_MARKER = 'data-grid-gutter'
const DAY_MARKER = /data-grid-day=/g
const EXPECTED_COLUMNS = 7
// The empty-week message appears exactly once (week level), so splitting on it yields two parts.
const EXPECTED_SPLIT_PARTS = 2
const EXPECTED_BLOCKS = 2
const EXPECTED_RESIZE_HANDLES = 2
const EXPECTED_WEEKLY_HOURS = 18
const DEFAULT_LOCALE = 'es'
const INVENTED_WEEKLY_TARGET = '40 horas'
const RESIZE_HANDLE_MARKER = /data-resize-handle="true"/g
const BLOCK_BUTTON_MARKER = /<button\b/g
const FOCUSABLE_TRACK_MARKER = /tabindex="0"/g
const SINGLE_OCCURRENCE_PARTS = 2
const props: AvailabilityWeekGridProps = {
  ranges: [RANGE],
  workday: { id: 'test-workday', name: 'Standard', hoursPerWeek: HOURS_PER_WEEK },
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

it('judges no single day against the jornada: its hours are a weekly target', () => {
  const ranges = [RANGE, TUESDAY_RANGE]
  const html = draw({ ...props, ranges })

  expect(html).not.toContain(HOURS_STATUS_MARKER)
})

it('explains an empty week while keeping seven usable columns', () => {
  const emptyProps = { ...props, ranges: [] }
  const html = draw(emptyProps)
  const message = translate(DEFAULT_LOCALE, EDITOR_COPY.emptyDay)

  expect(html.split(message)).toHaveLength(EXPECTED_SPLIT_PARTS)
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

it('says once, at the top, that there is no jornada instead of once per day', () => {
  const noJornadaProps = { ...props, workday: null }
  const html = draw(noJornadaProps)
  const notice = translate(DEFAULT_LOCALE, EDITOR_COPY.noJornadaAssigned)

  expect(html.split(notice)).toHaveLength(SINGLE_OCCURRENCE_PARTS)
  expect(html).not.toContain(HOURS_STATUS_MARKER)
})

it('shows no jornada notice while a workday is assigned', () => {
  const html = draw(props)
  const notice = translate(DEFAULT_LOCALE, EDITOR_COPY.noJornadaAssigned)

  expect(html).not.toContain(notice)
})

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { STATUS_COPY_KEYS } from '@/features/tasks/utils/availability'
import type { EditorDay } from '../types'
import type {
  DaySectionProps,
  EditableRange,
  RangeActionHandler,
  RangeChangeHandler,
} from '../component-types'
import EDITOR_COPY from '../constants'
import DaySection from './index'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const WEEKDAY = 1
const DAY_LABEL = 'Monday'
const EXPECTED_HOURS = 8
const BELOW_HOURS = 6
const START_TIME = '09:00'
const END_TIME = '17:00'
const SECOND_START_TIME = '18:00'
const SECOND_END_TIME = '19:00'
const FIRST_CLIENT_ID = 'range-one'
const SECOND_CLIENT_ID = 'range-two'
const DAY: EditorDay = { weekday: WEEKDAY, labelKey: EDITOR_COPY.dayLabelKey }

const ignoreChange: RangeChangeHandler = () => undefined
const ignoreAdd = () => undefined
const ignoreRemove: RangeActionHandler = () => undefined

const range = (clientId: string, startsAt: string, endsAt: string): EditableRange => ({
  clientId,
  weekday: WEEKDAY,
  startsAt,
  endsAt,
  note: EDITOR_COPY.emptyNote,
})

const buildProps = (ranges: EditableRange[], expectedHours: number | null): DaySectionProps => ({
  day: DAY,
  label: DAY_LABEL,
  ranges,
  expectedHours,
  errors: [],
  onChangeRange: ignoreChange,
  onAddRange: ignoreAdd,
  onRemoveRange: ignoreRemove,
})

const draw = (props: DaySectionProps) => {
  const element = createElement(DaySection, props)
  return renderToStaticMarkup(element)
}

describe('DaySection', () => {
  it('renders an accessible empty day and add action', () => {
    const html = draw(buildProps([], EXPECTED_HOURS))

    expect(html).toContain('<section')
    expect(html).toContain(DAY_LABEL)
    expect(html).toContain(EDITOR_COPY.emptyDay)
    expect(html).toContain(EDITOR_COPY.addRange)
    expect(html).toContain('type="button"')
  })

  it('renders every range with stable client identities', () => {
    const ranges = [
      range(FIRST_CLIENT_ID, START_TIME, END_TIME),
      range(SECOND_CLIENT_ID, SECOND_START_TIME, SECOND_END_TIME),
    ]
    const html = draw(buildProps(ranges, EXPECTED_HOURS))

    expect(html).toContain(FIRST_CLIENT_ID)
    expect(html).toContain(SECOND_CLIENT_ID)
    expect(html).toContain('type="time"')
  })

  it('renders below, complete, above, and unavailable daily states as text', () => {
    const belowHtml = draw(buildProps([range(FIRST_CLIENT_ID, START_TIME, '15:00')], EXPECTED_HOURS))
    const completeHtml = draw(buildProps([range(FIRST_CLIENT_ID, START_TIME, END_TIME)], EXPECTED_HOURS))
    const aboveHtml = draw(buildProps([range(FIRST_CLIENT_ID, START_TIME, END_TIME)], BELOW_HOURS))
    const unavailableHtml = draw(buildProps([range(FIRST_CLIENT_ID, START_TIME, '13:00')], null))

    expect(belowHtml).toContain(STATUS_COPY_KEYS.below)
    expect(completeHtml).toContain(STATUS_COPY_KEYS.complete)
    expect(aboveHtml).toContain(STATUS_COPY_KEYS.above)
    expect(unavailableHtml).toContain(STATUS_COPY_KEYS.unavailable)
  })
})

// DaySection tests define the visible contract for one weekday before its renderer is implemented.

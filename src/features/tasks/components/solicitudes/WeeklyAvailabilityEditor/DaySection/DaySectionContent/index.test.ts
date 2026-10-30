import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import { DAY_VALIDATION_SUMMARY_KEY } from '../constants'
import type { DaySectionContentProps } from '../types'
import DaySectionContent from './index'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const HEADING_ID = 'availability-day-1'
const LABEL = 'Monday'
const STATUS_TEXT = 'Declared hours: 8. Matches expected hours.'
const ADD_LABEL = 'Add Monday range'
const SINGLE_INVALID_RANGE_COUNT = 1
const NO_INVALID_RANGES = 0
const ignoreAdd = () => undefined
const PROPS: DaySectionContentProps = {
  headingId: HEADING_ID,
  label: LABEL,
  isEmpty: true,
  invalidRangeCount: SINGLE_INVALID_RANGE_COUNT,
  renderedRanges: [],
  comparisonText: STATUS_TEXT,
  addButtonProps: { label: ADD_LABEL, onAdd: ignoreAdd },
}

describe('DaySectionContent', () => {
  it('keeps day, empty, validation, and comparison text visible', () => {
    const element = createElement(DaySectionContent, PROPS)
    const html = renderToStaticMarkup(element)

    expect(html).toContain(LABEL)
    expect(html).toContain(EDITOR_COPY.emptyDay)
    expect(html).toContain('role="alert"')
    expect(html).toContain(DAY_VALIDATION_SUMMARY_KEY)
    expect(html).toContain(STATUS_TEXT)
    expect(html).toContain(ADD_LABEL)
  })

  it('hides the day validation banner once every range is valid', () => {
    const validProps: DaySectionContentProps = { ...PROPS, invalidRangeCount: NO_INVALID_RANGES }

    const html = renderToStaticMarkup(createElement(DaySectionContent, validProps))

    expect(html).not.toContain(DAY_VALIDATION_SUMMARY_KEY)
  })
})

// DaySectionContent owns the visible weekday messages while DaySection owns the semantic region.

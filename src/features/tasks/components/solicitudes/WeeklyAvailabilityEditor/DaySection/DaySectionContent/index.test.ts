import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type { DaySectionContentProps } from '../types'
import DaySectionContent from './index'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const HEADING_ID = 'availability-day-1'
const LABEL = 'Monday'
const STATUS_TEXT = 'Declared hours: 8. Matches expected hours.'
const ADD_LABEL = 'Add Monday range'
const ignoreAdd = () => undefined
const PROPS: DaySectionContentProps = {
  headingId: HEADING_ID,
  label: LABEL,
  isEmpty: true,
  hasErrors: true,
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
    expect(html).toContain(EDITOR_COPY.validationError)
    expect(html).toContain(STATUS_TEXT)
    expect(html).toContain(ADD_LABEL)
  })
})

// DaySectionContent owns the visible weekday messages while DaySection owns the semantic region.

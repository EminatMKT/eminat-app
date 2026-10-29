import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type {
  EditableRange,
  RangeActionHandler,
  RangeChangeHandler,
} from '../component-types'
import type { AvailabilityRangeItemProps } from './types'
import AvailabilityRangeItem from './index'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const CLIENT_ID = 'range-client-1'
const RANGE_INDEX = 0
const RANGE_NUMBER = 1
const DAY_LABEL = 'Monday'
const START_TIME = '09:00'
const END_TIME = '17:00'
const NOTE = 'Focus work'
const ERROR_CODE = 'end-not-after-start'
const START_ID_SUFFIX = '-start'
const END_ID_SUFFIX = '-end'
const NOTE_ID_SUFFIX = '-note'
const REMOVE_LABEL = 'Remove Monday range 1'

const RANGE: EditableRange = {
  clientId: CLIENT_ID,
  weekday: 1,
  startsAt: START_TIME,
  endsAt: END_TIME,
  note: NOTE,
}

const ERRORS: RangeValidationError[] = [{ code: ERROR_CODE, rangeIndex: RANGE_INDEX }]
const ignoreChange: RangeChangeHandler = () => undefined
const ignoreRemove: RangeActionHandler = () => undefined

const PROPS: AvailabilityRangeItemProps = {
  range: RANGE,
  rangeIndex: RANGE_INDEX,
  number: RANGE_NUMBER,
  dayLabel: DAY_LABEL,
  errors: ERRORS,
  onChange: ignoreChange,
  onRemove: ignoreRemove,
  removeLabel: REMOVE_LABEL,
}

const draw = (props: AvailabilityRangeItemProps) => {
  const element = createElement(AvailabilityRangeItem, props)
  return renderToStaticMarkup(element)
}

describe('AvailabilityRangeItem', () => {
  it('composes independently identified start, end, and note fields', () => {
    const html = draw(PROPS)

    expect(html).toContain(`id=\"${CLIENT_ID}${START_ID_SUFFIX}\"`)
    expect(html).toContain(`id=\"${CLIENT_ID}${END_ID_SUFFIX}\"`)
    expect(html).toContain(`id=\"${CLIENT_ID}${NOTE_ID_SUFFIX}\"`)
    expect(html).toContain(DAY_LABEL)
    expect(html).toContain(NOTE)
  })

  it('links validation feedback and exposes a destructive button label', () => {
    const html = draw(PROPS)

    expect(html).toContain('aria-invalid=\"true\"')
    expect(html).toContain('role=\"alert\"')
    expect(html).toContain(`aria-label=\"${REMOVE_LABEL}\"`)
    expect(html).toContain('type=\"button\"')
  })

  it('keeps the item keyed by the stable client identity in its rendered controls', () => {
    const alternateRange: EditableRange = { ...RANGE, clientId: 'range-client-2' }
    const alternateProps: AvailabilityRangeItemProps = { ...PROPS, range: alternateRange }

    const firstHtml = draw(PROPS)
    const secondHtml = draw(alternateProps)

    expect(firstHtml).toContain(CLIENT_ID)
    expect(secondHtml).toContain(alternateRange.clientId)
    expect(secondHtml).not.toContain(CLIENT_ID)
  })
})

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import { FIVE_PM, NINE_AM } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import {
  END_NOT_AFTER_START_CODE,
  SAMPLE_CLIENT_ID,
  SAMPLE_DAY_LABEL,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/constants'
import type {
  EditableRange,
  RangeActionHandler,
  RangeChangeHandler,
} from '../component-types'
import { FOCUS_NOTE, REMOVE_MONDAY_RANGE_LABEL } from '../test-fixtures/constants'
import { AVAILABILITY_RANGE_ITEM_CONSTANTS } from './constants'
import type { AvailabilityRangeItemProps } from './types'
import AvailabilityRangeItem from './index'

const { I18N_MODULE } = vi.hoisted(() => ({ I18N_MODULE: '@/shared/i18n' }))

vi.mock(I18N_MODULE, () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const CLIENT_ID = SAMPLE_CLIENT_ID
const RANGE_INDEX = 0
const RANGE_NUMBER = 1
const DAY_LABEL = SAMPLE_DAY_LABEL
const START_TIME = NINE_AM
const END_TIME = FIVE_PM
const NOTE = FOCUS_NOTE
const ERROR_CODE = END_NOT_AFTER_START_CODE
const START_ID_SUFFIX = AVAILABILITY_RANGE_ITEM_CONSTANTS.startIdSuffix
const END_ID_SUFFIX = AVAILABILITY_RANGE_ITEM_CONSTANTS.endIdSuffix
const NOTE_ID_SUFFIX = AVAILABILITY_RANGE_ITEM_CONSTANTS.noteIdSuffix
const REMOVE_LABEL = REMOVE_MONDAY_RANGE_LABEL

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
    expect(html).toMatch(`id=\"${CLIENT_ID}${END_ID_SUFFIX}\"`)
    expect(html).toContain(`id=\"${CLIENT_ID}${NOTE_ID_SUFFIX}\"`)
    expect(html).toMatch(DAY_LABEL)
    expect(html).toContain(NOTE)
  })

  it('links validation feedback and exposes a destructive button label', () => {
    const html = draw(PROPS)

    expect(html).toMatch(/aria-invalid="true"/)
    expect(html).toMatch(/role="alert"/)
    expect(html).toContain(`aria-label=\"${REMOVE_LABEL}\"`)
    expect(html).toMatch(/type="button"/)
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

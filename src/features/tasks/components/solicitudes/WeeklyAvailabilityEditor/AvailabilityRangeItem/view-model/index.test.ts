import {
  describe,
  expect,
  it,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import type { Translator } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import { FIVE_PM, NINE_AM } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import {
  END_NOT_AFTER_START_CODE,
  SAMPLE_CLIENT_ID,
  SAMPLE_DAY_LABEL,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/constants'
import {
  FOCUS_NOTE,
  REMOVE_MONDAY_RANGE_LABEL,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/test-fixtures/constants'
import type { AvailabilityRangeItemProps } from '../types'
import buildAvailabilityRangeItemViewModel from './index'

const CLIENT_ID = SAMPLE_CLIENT_ID
const RANGE_INDEX = 0
const RANGE_NUMBER = 1
const DAY_LABEL = SAMPLE_DAY_LABEL
const START_TIME = NINE_AM
const END_TIME = FIVE_PM
const NOTE = FOCUS_NOTE
const ERROR_CODE = END_NOT_AFTER_START_CODE
const REMOVE_LABEL = REMOVE_MONDAY_RANGE_LABEL

const RANGE: EditableRange = {
  clientId: CLIENT_ID,
  weekday: 1,
  startsAt: START_TIME,
  endsAt: END_TIME,
  note: NOTE,
}

const ERRORS: RangeValidationError[] = [{ code: ERROR_CODE, rangeIndex: RANGE_INDEX }]
const ignoreChange = () => undefined
const ignoreRemove = () => undefined
const translate: Translator = key => key

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

describe('buildAvailabilityRangeItemViewModel', () => {
  it('builds three independently identified field props', () => {
    const viewModel = buildAvailabilityRangeItemViewModel(PROPS, translate)

    expect(viewModel.startField.id).toContain(CLIENT_ID)
    expect(viewModel.startField.value).toBe(START_TIME)
    expect(viewModel.endField.id).toContain(CLIENT_ID)
    expect(viewModel.endField.value).toBe(END_TIME)
    expect(viewModel.noteField.id).toContain(CLIENT_ID)
    expect(viewModel.noteField.value).toBe(NOTE)
  })

  it('assigns validation feedback to both time fields', () => {
    const viewModel = buildAvailabilityRangeItemViewModel(PROPS, translate)

    expect(viewModel.startField.error).toBeDefined()
    expect(viewModel.endField.error).toBeDefined()
    expect(viewModel.noteField.error).toBeUndefined()
  })

  it('keeps the caller-provided accessible removal label', () => {
    const viewModel = buildAvailabilityRangeItemViewModel(PROPS, translate)

    expect(viewModel.removeButton.label).toBe(REMOVE_LABEL)
  })
})

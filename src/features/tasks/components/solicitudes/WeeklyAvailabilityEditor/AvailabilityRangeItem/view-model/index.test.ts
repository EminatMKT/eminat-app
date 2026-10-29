import {
  describe,
  expect,
  it,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { AvailabilityRangeItemProps } from '../types'
import buildAvailabilityRangeItemViewModel from './index'

const CLIENT_ID = 'range-client-1'
const RANGE_INDEX = 0
const RANGE_NUMBER = 1
const DAY_LABEL = 'Monday'
const START_TIME = '09:00'
const END_TIME = '17:00'
const NOTE = 'Focus work'
const ERROR_CODE = 'end-not-after-start'
const REMOVE_LABEL = 'Remove Monday range 1'

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
    const viewModel = buildAvailabilityRangeItemViewModel(PROPS)

    expect(viewModel.startField.id).toContain(CLIENT_ID)
    expect(viewModel.endField.id).toContain(CLIENT_ID)
    expect(viewModel.noteField.id).toContain(CLIENT_ID)
    expect(viewModel.startField.value).toBe(START_TIME)
    expect(viewModel.endField.value).toBe(END_TIME)
    expect(viewModel.noteField.value).toBe(NOTE)
  })

  it('assigns validation feedback to both time fields', () => {
    const viewModel = buildAvailabilityRangeItemViewModel(PROPS)

    expect(viewModel.startField.error).toBeDefined()
    expect(viewModel.endField.error).toBeDefined()
    expect(viewModel.noteField.error).toBeUndefined()
  })

  it('keeps the caller-provided accessible removal label', () => {
    const viewModel = buildAvailabilityRangeItemViewModel(PROPS)

    expect(viewModel.removeButton.label).toBe(REMOVE_LABEL)
  })
})

import { describe, expect, it } from 'vitest'
import {
  RANGE_START_FIELD_ID,
  START_BEFORE_END_ERROR,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/test-fixtures/constants'
import { RANGE_FIELD_CONSTANTS } from '../constants'
import describedByIds from './index'

const FIELD_ID = RANGE_START_FIELD_ID
const ERROR = START_BEFORE_END_ERROR
const COUNTER_TEXT = '20 characters remaining'
const SEPARATOR = RANGE_FIELD_CONSTANTS.describedBySeparator

describe('describedByIds', () => {
  it('links only the error id when there is no counter', () => {
    const ids = describedByIds({ id: FIELD_ID, error: ERROR })

    expect(ids.errorId).toBe(`${FIELD_ID}${RANGE_FIELD_CONSTANTS.errorSuffix}`)
    expect(ids.counterId).toBeUndefined()
    expect(ids.describedBy).toBe(ids.errorId)
  })

  it('links only the counter id when there is no error', () => {
    const ids = describedByIds({ id: FIELD_ID, counterText: COUNTER_TEXT })

    expect(ids.counterId).toBe(`${FIELD_ID}${RANGE_FIELD_CONSTANTS.counterSuffix}`)
    expect(ids.errorId).toBeUndefined()
    expect(ids.describedBy).toBe(ids.counterId)
  })

  it('joins both ids when a field carries an error and a counter', () => {
    const ids = describedByIds({ id: FIELD_ID, error: ERROR, counterText: COUNTER_TEXT })
    const joined = `${ids.errorId}${SEPARATOR}${ids.counterId}`

    expect(ids.describedBy).toBe(joined)
  })

  it('leaves describedBy undefined with neither an error nor a counter', () => {
    const ids = describedByIds({ id: FIELD_ID })

    expect(ids.describedBy).toBeUndefined()
  })
})

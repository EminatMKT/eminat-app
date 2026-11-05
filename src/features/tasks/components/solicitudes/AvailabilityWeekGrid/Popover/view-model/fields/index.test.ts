import {
  describe,
  expect,
  it,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { AvailabilityRangeItemProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/types'
import type { Translator } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import buildAvailabilityRangeItemFields from './index'

const CLIENT_ID = 'range-client-1'
const RANGE: EditableRange = {
  clientId: CLIENT_ID,
  weekday: 1,
  startsAt: '09:00',
  endsAt: '17:00',
  note: 'Focus work',
}
const ERRORS: RangeValidationError[] = []
const ignoreChange = () => undefined
const ignoreRemove = () => undefined
const translate: Translator = key => key
const PROPS: AvailabilityRangeItemProps = {
  range: RANGE,
  rangeIndex: 0,
  number: 1,
  dayLabel: 'Monday',
  errors: ERRORS,
  onChange: ignoreChange,
  onRemove: ignoreRemove,
}

describe('buildAvailabilityRangeItemFields', () => {
  it('uses the stable client identity for all field IDs', () => {
    const fields = buildAvailabilityRangeItemFields(PROPS, translate)

    expect(fields.startField.id).toContain(CLIENT_ID)
    expect(fields.endField.id).toContain(CLIENT_ID)
    expect(fields.noteField.id).toContain(CLIENT_ID)
  })

  it('attaches the specific error copy to both time fields, never the note', () => {
    const errors: RangeValidationError[] = [{ code: 'overlap', rangeIndex: 0, conflictingRangeIndex: 1 }]
    const propsWithError: AvailabilityRangeItemProps = { ...PROPS, errors }

    const fields = buildAvailabilityRangeItemFields(propsWithError, translate)

    expect(fields.startField.error).toBe('tasks.availability.overlap')
    expect(fields.endField.error).toBe('tasks.availability.overlap')
    expect(fields.noteField.error).toBeUndefined()
  })
})

import {
  describe,
  expect,
  it,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { AvailabilityRangeItemProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/types'
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
    const fields = buildAvailabilityRangeItemFields(PROPS)

    expect(fields.startField.id).toContain(CLIENT_ID)
    expect(fields.endField.id).toContain(CLIENT_ID)
    expect(fields.noteField.id).toContain(CLIENT_ID)
  })
})

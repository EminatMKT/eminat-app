import {
  describe,
  expect,
  it,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import type { AvailabilityRangeItemProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/types'
import {
  OVERLAP_CODE,
  OVERLAP_COPY_KEY,
  SAMPLE_CLIENT_ID,
  SAMPLE_DAY_LABEL,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/constants'
import buildAvailabilityRangeItemFields from './index'

const RANGE: EditableRange = {
  clientId: SAMPLE_CLIENT_ID,
  weekday: 1,
  startsAt: '09:00',
  endsAt: '17:00',
  note: 'Focus work',
}
const ERRORS: RangeValidationError[] = []
const ignoreChange = () => undefined
const ignoreRemove = () => undefined
const translate = (key: string) => key
const PROPS: AvailabilityRangeItemProps = {
  range: RANGE,
  rangeIndex: 0,
  number: 1,
  dayLabel: SAMPLE_DAY_LABEL,
  errors: ERRORS,
  onChange: ignoreChange,
  onRemove: ignoreRemove,
}

describe('buildAvailabilityRangeItemFields', () => {
  it('uses the stable client identity for all field IDs', () => {
    const fields = buildAvailabilityRangeItemFields(PROPS, translate)
    const fieldIds = [fields.startField.id, fields.endField.id, fields.noteField.id]

    for (const id of fieldIds) {
      expect(id).toContain(SAMPLE_CLIENT_ID)
    }
  })

  it('attaches the specific error copy to both time fields, never the note', () => {
    const overlap: RangeValidationError = {
      code: OVERLAP_CODE,
      rangeIndex: 0,
      conflictingRangeIndex: 1,
    }
    const propsWithError: AvailabilityRangeItemProps = { ...PROPS, errors: [overlap] }

    const fields = buildAvailabilityRangeItemFields(propsWithError, translate)

    expect(fields.startField.error).toBe(OVERLAP_COPY_KEY)
    expect(fields.endField.error).toBe(OVERLAP_COPY_KEY)
    expect(fields.noteField.error).toBeUndefined()
  })
})

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'
import buildPopoverFields from './index'
import type { PopoverFieldsInput } from './types'

const CLIENT_ID = 'range-client-1'
const OVERLAP_CODE = 'overlap'
const OVERLAP_ERROR_KEY = 'tasks.availability.overlap'
const NOTE_FIELD = 'note'
const translate = (key: string) => key
const changeField = vi.fn()
const RANGE: EditableRange = {
  clientId: CLIENT_ID,
  weekday: 1,
  startsAt: '09:00',
  endsAt: '17:00',
  note: 'Focus work',
}
const DRAFT: PopoverDraft = { startsAt: '08:00', endsAt: '12:00', note: 'Updated note' }
const INPUT: PopoverFieldsInput = {
  range: RANGE,
  draft: DRAFT,
  error: undefined,
  dayLabel: 'Monday',
  readOnly: false,
  changeField,
}

describe('buildPopoverFields', () => {
  it("shows the draft's own values, not the range's", () => {
    const fields = buildPopoverFields(INPUT, translate)

    expect(fields.startField.value).toBe(DRAFT.startsAt)
    expect(fields.endField.value).toBe(DRAFT.endsAt)
    expect(fields.noteField.value).toBe(DRAFT.note)
  })

  it('leaves every field enabled while editing is allowed', () => {
    const fields = buildPopoverFields(INPUT, translate)

    expect(fields.startField.disabled).toBe(false)
    expect(fields.endField.disabled).toBe(false)
    expect(fields.noteField.disabled).toBe(false)
  })

  it('disables every field in read-only view mode', () => {
    const readOnlyInput: PopoverFieldsInput = { ...INPUT, readOnly: true }

    const fields = buildPopoverFields(readOnlyInput, translate)

    expect(fields.startField.disabled).toBe(true)
    expect(fields.endField.disabled).toBe(true)
    expect(fields.noteField.disabled).toBe(true)
  })

  it('surfaces the error on both time fields, never the note', () => {
    const error: RangeValidationError = {
      code: OVERLAP_CODE,
      rangeIndex: 0,
      conflictingRangeIndex: 1,
    }
    const inputWithError: PopoverFieldsInput = { ...INPUT, error }

    const fields = buildPopoverFields(inputWithError, translate)

    expect(fields.startField.error).toBe(OVERLAP_ERROR_KEY)
    expect(fields.endField.error).toBe(OVERLAP_ERROR_KEY)
    expect(fields.noteField.error).toBeUndefined()
  })

  it("routes a field change through changeField, dropping the range's clientId", () => {
    const fields = buildPopoverFields(INPUT, translate)
    const NEW_NOTE = 'Changed'

    fields.noteField.onChange(NEW_NOTE)

    expect(changeField).toHaveBeenCalledWith(NOTE_FIELD, NEW_NOTE)
  })
})

// Reuses view-model/fields's own id/label/error logic verbatim; only the value source (draft
// instead of the live range) and the disabled overlay are Popover-specific.

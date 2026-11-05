import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { PopoverDraft, ValidateDraftInput } from './types'
import validateDraft from './index'

const MORNING_INDEX = 0
const AFTERNOON_INDEX = 1
const MORNING_RANGE: WeeklyAvailabilityRange = {
  weekday: 1,
  startsAt: '09:00',
  endsAt: '12:00',
  note: 'Morning',
}
const AFTERNOON_RANGE: WeeklyAvailabilityRange = {
  weekday: 1,
  startsAt: '13:00',
  endsAt: '17:00',
  note: 'Afternoon',
}
const DAY_RANGES: WeeklyAvailabilityRange[] = [MORNING_RANGE, AFTERNOON_RANGE]

const buildInput = (rangeIndex: number, draft: PopoverDraft): ValidateDraftInput => ({
  ranges: DAY_RANGES,
  rangeIndex,
  draft,
})

describe('validateDraft', () => {
  it('reports no error for a valid, non-conflicting change', () => {
    const draft: PopoverDraft = { startsAt: '08:00', endsAt: '12:00', note: 'Morning' }

    expect(validateDraft(buildInput(MORNING_INDEX, draft))).toBeUndefined()
  })

  it('reports the end-not-after-start error for a reversed draft', () => {
    const draft: PopoverDraft = { startsAt: '12:00', endsAt: '09:00', note: 'Morning' }
    const error = validateDraft(buildInput(MORNING_INDEX, draft))

    expect(error?.code).toBe('end-not-after-start')
  })

  it("reports the overlap error on the edited range when it collides with the other", () => {
    // validateRanges attributes an overlap to the LATER index in array order, so the edited
    // range here must be AFTERNOON_INDEX for the error to land on the range being edited.
    const draft: PopoverDraft = { startsAt: '11:00', endsAt: '17:00', note: 'Afternoon' }
    const error = validateDraft(buildInput(AFTERNOON_INDEX, draft))

    expect(error?.code).toBe('overlap')
  })

  it('does not report an error from a change that never touches validity', () => {
    const draft: PopoverDraft = { startsAt: '09:00', endsAt: '12:00', note: 'Updated note' }

    expect(validateDraft(buildInput(MORNING_INDEX, draft))).toBeUndefined()
  })

  it("never reports another range's own standing error as this draft's problem", () => {
    const reversedAfternoon: WeeklyAvailabilityRange = {
      weekday: 1,
      startsAt: '17:00',
      endsAt: '13:00',
      note: 'Afternoon',
    }
    const ranges: WeeklyAvailabilityRange[] = [MORNING_RANGE, reversedAfternoon]
    const draft: PopoverDraft = { startsAt: '09:00', endsAt: '12:00', note: 'Updated note' }
    const input: ValidateDraftInput = { ranges, rangeIndex: MORNING_INDEX, draft }

    expect(validateDraft(input)).toBeUndefined()
  })
})

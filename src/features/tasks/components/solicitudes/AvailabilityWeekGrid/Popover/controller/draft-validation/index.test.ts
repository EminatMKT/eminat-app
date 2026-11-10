import { describe, expect, it } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import { AVAILABILITY_RANGE_ITEM_CONSTANTS }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/constants'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'
import deriveDraftValidation from './index'
import type { DraftValidationScope } from './types'

const RANGE: EditableRange = {
  clientId: 'range-client-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '17:00',
  note: 'Focus work',
}
const UNTOUCHED_DRAFT: PopoverDraft = {
  startsAt: RANGE.startsAt,
  endsAt: RANGE.endsAt,
  note: RANGE.note,
}
const TOUCHED_DRAFT: PopoverDraft = { startsAt: '08:00', endsAt: '17:00', note: 'Focus work' }
const INVALID_DRAFT: PopoverDraft = { startsAt: '12:00', endsAt: '09:00', note: 'Focus work' }
const NEW_SCOPE: DraftValidationScope = {
  range: RANGE,
  ranges: [RANGE],
  rangeIndex: 0,
  isNewlyCreated: true,
}
const EXISTING_SCOPE: DraftValidationScope = {
  range: RANGE,
  ranges: [RANGE],
  rangeIndex: 0,
  isNewlyCreated: false,
}

describe('deriveDraftValidation', () => {
  it('reports canSave true for an untouched draft on a newly created range', () => {
    const result = deriveDraftValidation(NEW_SCOPE, UNTOUCHED_DRAFT)

    expect(result.error).toBeUndefined()
    expect(result.canSave).toBe(true)
  })

  it('reports canSave false for an untouched draft on an existing range', () => {
    const result = deriveDraftValidation(EXISTING_SCOPE, UNTOUCHED_DRAFT)

    expect(result.error).toBeUndefined()
    expect(result.canSave).toBe(false)
  })

  it('reports canSave true once a valid change is made, new or existing', () => {
    const result = deriveDraftValidation(EXISTING_SCOPE, TOUCHED_DRAFT)

    expect(result.error).toBeUndefined()
    expect(result.canSave).toBe(true)
  })

  it('never reports canSave true for an invalid draft, even newly created', () => {
    const result = deriveDraftValidation(NEW_SCOPE, INVALID_DRAFT)

    expect(result.error?.code).toBe(AVAILABILITY_RANGE_ITEM_CONSTANTS.endNotAfterStartCode)
    expect(result.canSave).toBe(false)
  })
})

// Mirrors draft/index.test.ts's own cases; this module only adds canSave on top of validateDraft.

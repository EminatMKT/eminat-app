import { describe, expect, it } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import AVAILABILITY_RANGE_ITEM_CONSTANTS from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/constants'
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
const SCOPE: DraftValidationScope = { range: RANGE, ranges: [RANGE], rangeIndex: 0 }

describe('deriveDraftValidation', () => {
  it('reports no error and canSave false when the draft matches the range', () => {
    const draft: PopoverDraft = { startsAt: RANGE.startsAt, endsAt: RANGE.endsAt, note: RANGE.note }

    const result = deriveDraftValidation(SCOPE, draft)

    expect(result.error).toBeUndefined()
    expect(result.canSave).toBe(false)
  })

  it('reports canSave true once a valid change is made', () => {
    const draft: PopoverDraft = { startsAt: '08:00', endsAt: '17:00', note: 'Focus work' }

    const result = deriveDraftValidation(SCOPE, draft)

    expect(result.error).toBeUndefined()
    expect(result.canSave).toBe(true)
  })

  it('reports the validation error and canSave false for a reversed draft', () => {
    const draft: PopoverDraft = { startsAt: '12:00', endsAt: '09:00', note: 'Focus work' }

    const result = deriveDraftValidation(SCOPE, draft)

    expect(result.error?.code).toBe(AVAILABILITY_RANGE_ITEM_CONSTANTS.endNotAfterStartCode)
    expect(result.canSave).toBe(false)
  })
})

// Mirrors draft/index.test.ts's own cases; this module only adds canSave on top of validateDraft.

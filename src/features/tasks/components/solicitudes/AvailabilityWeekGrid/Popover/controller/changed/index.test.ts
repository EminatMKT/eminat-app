import { describe, expect, it } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { PopoverDraft } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/draft/types'
import draftChanged from './index'

const RANGE: EditableRange = {
  clientId: 'range-client-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '17:00',
  note: 'Focus work',
}

describe('draftChanged', () => {
  it('is false when the draft still matches the range it started from', () => {
    const draft: PopoverDraft = { startsAt: '09:00', endsAt: '17:00', note: 'Focus work' }

    expect(draftChanged(draft, RANGE)).toBe(false)
  })

  it('is true once the start time diverges', () => {
    const draft: PopoverDraft = { startsAt: '10:00', endsAt: '17:00', note: 'Focus work' }

    expect(draftChanged(draft, RANGE)).toBe(true)
  })

  it('is true once the end time diverges', () => {
    const draft: PopoverDraft = { startsAt: '09:00', endsAt: '18:00', note: 'Focus work' }

    expect(draftChanged(draft, RANGE)).toBe(true)
  })

  it('is true once the note diverges', () => {
    const draft: PopoverDraft = { startsAt: '09:00', endsAt: '17:00', note: 'Changed note' }

    expect(draftChanged(draft, RANGE)).toBe(true)
  })

  it('treats a null range note the same as an empty draft note', () => {
    const rangeWithNullNote: EditableRange = { ...RANGE, note: null }
    const draft: PopoverDraft = { startsAt: '09:00', endsAt: '17:00', note: '' }

    expect(draftChanged(draft, rangeWithNullNote)).toBe(false)
  })
})

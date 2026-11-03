import { describe, expect, it } from 'vitest'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import createEditorStateFacade from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-state'
import createExplicitTimesFacade from '.'

const MONDAY = 1
const TUESDAY = 2
const CLIENT_ID = 'range-1'
const MISSING_CLIENT_ID = 'range-missing'
const MEMBER: AvailabilityMemberDto = {
  id: 'm-1',
  name: 'Ana',
  team: null,
  workday: null,
  ranges: [
    {
      id: CLIENT_ID,
      weekday: MONDAY,
      startsAt: '09:00',
      endsAt: '12:00',
      note: null,
    },
  ],
  canEdit: true,
}
const { createEditorState } = createEditorStateFacade()
const { addRangeWithTimes, changeRangeTimes } = createExplicitTimesFacade()

describe('WeeklyAvailabilityEditor explicit-times range actions', () => {
  it('appends a draft range at the given weekday and explicit times', () => {
    const state = createEditorState({ ...MEMBER, ranges: [] })
    const times = { startsAt: '14:00', endsAt: '15:00' }
    const next = addRangeWithTimes(state, TUESDAY, times)
    const [draft] = next.ranges

    expect(draft?.weekday).toBe(TUESDAY)
    expect(draft?.startsAt).toBe('14:00')
    expect(draft?.endsAt).toBe('15:00')
  })

  it('updates both ends of the range matching the client id, in one call', () => {
    const state = createEditorState(MEMBER)
    const times = { startsAt: '10:00', endsAt: '11:30' }
    const next = changeRangeTimes(state, CLIENT_ID, times)
    const [resized] = next.ranges

    expect(resized?.startsAt).toBe('10:00')
    expect(resized?.endsAt).toBe('11:30')
  })

  it('leaves state unchanged when resizing a missing client id', () => {
    const state = createEditorState(MEMBER)
    const times = { startsAt: '10:00', endsAt: '11:30' }
    const next = changeRangeTimes(state, MISSING_CLIENT_ID, times)

    expect(next).toBe(state)
  })
})

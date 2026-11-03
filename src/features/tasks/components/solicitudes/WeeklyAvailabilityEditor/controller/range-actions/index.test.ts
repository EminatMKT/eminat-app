import { describe, expect, it } from 'vitest'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import type { LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import createEditorStateFacade from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-state'
import createRangeActionsFacade from './index'

const MONDAY = 1
const TUESDAY = 2
const WEDNESDAY = 3
const FIRST_CLIENT_ID = 'range-1'
const SECOND_CLIENT_ID = 'range-2'
const MISSING_CLIENT_ID = 'range-missing'
const EXPECTED_RANGE_COUNT = 2
const SECOND_INDEX = 1
const FIRST_RANGE_INDEX = 0
const WEDNESDAY_NOTE = 'wednesday note'
const MEMBER: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana',
  team: null,
  workday: null,
  ranges: [
    {
      id: FIRST_CLIENT_ID,
      weekday: MONDAY,
      startsAt: '09:00',
      endsAt: '12:00',
      note: null,
    },
    {
      id: SECOND_CLIENT_ID,
      weekday: MONDAY,
      startsAt: '13:00',
      endsAt: '17:00',
      note: 'focus',
    },
  ],
  canEdit: true,
}
const SINGLE_RANGE_MEMBER: AvailabilityMemberDto = { ...MEMBER, ranges: [MEMBER.ranges[FIRST_RANGE_INDEX]] }

const { createEditorState } = createEditorStateFacade()
const { addRange, changeRange, removeRange, addRangeWithTimes, changeRangeTimes } = createRangeActionsFacade()

describe('WeeklyAvailabilityEditor range actions', () => {
  it('adapts add, change, and remove actions from client ids', () => {
    const state = createEditorState(MEMBER)
    const changed = changeRange(state, FIRST_CLIENT_ID, EDITOR_COPY.noteField, 'call')
    const added = addRange(changed, MONDAY)
    const removed = removeRange(added, SECOND_CLIENT_ID)
    const [firstRange, secondRange] = removed.ranges
    const [originalFirstRange] = state.ranges

    expect(removed.ranges).toHaveLength(EXPECTED_RANGE_COUNT)
    expect(firstRange.note).toBe('call')
    expect(secondRange.note).toBe(EDITOR_COPY.emptyNote)
    expect(originalFirstRange.note).toBeNull()
  })

  it('leaves state unchanged when a client id is missing', () => {
    const state: LocalEditorState = createEditorState(MEMBER)
    const next = removeRange(state, MISSING_CLIENT_ID)

    expect(next).toBe(state)
  })

  it('never reuses a draft client id across an add/remove/add sequence', () => {
    const initial = createEditorState(SINGLE_RANGE_MEMBER)
    const afterMondayDraft = addRange(initial, MONDAY)
    const mondayDraft = afterMondayDraft.ranges[afterMondayDraft.ranges.length - 1]
    const afterTuesdayDraft = addRange(afterMondayDraft, TUESDAY)
    const tuesdayDraft = afterTuesdayDraft.ranges[afterTuesdayDraft.ranges.length - 1]
    const afterRemovingMonday = removeRange(afterTuesdayDraft, mondayDraft.clientId)
    const afterWednesdayDraft = addRange(afterRemovingMonday, WEDNESDAY)
    const wednesdayDraft = afterWednesdayDraft.ranges[afterWednesdayDraft.ranges.length - 1]

    expect(wednesdayDraft.clientId).not.toBe(tuesdayDraft.clientId)

    const changed = changeRange(afterWednesdayDraft, wednesdayDraft.clientId, EDITOR_COPY.noteField, WEDNESDAY_NOTE)
    const tuesdayAfterChange = changed.ranges.find(range => range.clientId === tuesdayDraft.clientId)
    const wednesdayAfterChange = changed.ranges.find(range => range.clientId === wednesdayDraft.clientId)

    expect(tuesdayAfterChange?.note).toBe(EDITOR_COPY.emptyNote)
    expect(wednesdayAfterChange?.note).toBe(WEDNESDAY_NOTE)

    const afterRemovingWednesday = removeRange(changed, wednesdayDraft.clientId)

    expect(afterRemovingWednesday.ranges.some(range => range.clientId === tuesdayDraft.clientId)).toBe(true)
    expect(afterRemovingWednesday.ranges.some(range => range.clientId === wednesdayDraft.clientId)).toBe(false)
  })

  it('creates a range at an explicit start/end by weekday', () => {
    const state = createEditorState(SINGLE_RANGE_MEMBER)
    const times = { startsAt: '14:00', endsAt: '15:00' }
    const added = addRangeWithTimes(state, TUESDAY, times)
    const [, draft] = added.ranges

    expect(draft?.weekday).toBe(TUESDAY)
    expect(draft?.startsAt).toBe('14:00')
    expect(draft?.endsAt).toBe('15:00')
  })

  it('updates both ends of a range at once by client id', () => {
    const state = createEditorState(MEMBER)
    const times = { startsAt: '10:00', endsAt: '11:30' }
    const resized = changeRangeTimes(state, FIRST_CLIENT_ID, times)
    const [firstRange] = resized.ranges

    expect(firstRange?.startsAt).toBe('10:00')
    expect(firstRange?.endsAt).toBe('11:30')
  })

  it('leaves state unchanged when resizing a missing client id', () => {
    const state = createEditorState(MEMBER)
    const times = { startsAt: '10:00', endsAt: '11:30' }
    const next = changeRangeTimes(state, MISSING_CLIENT_ID, times)

    expect(next).toBe(state)
  })
})

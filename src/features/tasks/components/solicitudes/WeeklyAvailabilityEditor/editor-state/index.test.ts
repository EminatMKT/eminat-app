import { describe, expect, it } from 'vitest'
import type { AvailabilityMemberDto, AvailabilityRangeDto } from '@/features/tasks/data/availability/types'
import type { EditorAction } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import EDITOR_COPY from '../constants'
import {
  ADD_ACTION_KIND,
  CHANGE_ACTION_KIND,
  REMOVE_ACTION_KIND,
} from './constants'
import createEditorStateFacade from './index'

const {
  applyEditorAction,
  createEditorState,
  toSaveRanges,
} = createEditorStateFacade()

const MONDAY = 1
const FIRST_INDEX = 0
const SECOND_INDEX = 1
const FIRST_RANGE: AvailabilityRangeDto = {
  id: 'range-1',
  weekday: MONDAY,
  startsAt: '09:00',
  endsAt: '12:00',
  note: null,
}
const SECOND_RANGE: AvailabilityRangeDto = {
  id: 'range-2',
  weekday: MONDAY,
  startsAt: '13:00',
  endsAt: '17:00',
  note: 'focus',
}
const MEMBER: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana',
  team: null,
  workday: null,
  ranges: [FIRST_RANGE, SECOND_RANGE],
  canEdit: true,
}

const changeFirstRangeNote = (value: string): EditorAction => ({
  kind: CHANGE_ACTION_KIND,
  rangeIndex: FIRST_INDEX,
  field: EDITOR_COPY.noteField,
  value,
})

describe('WeeklyAvailabilityEditor editor state', () => {
  it('initializes stable client ids and copies persisted ranges', () => {
    const state = createEditorState(MEMBER)
    expect(state.ranges.map(range => range.clientId)).toEqual(['range-1', 'range-2'])
    expect(state.ranges[FIRST_INDEX]).not.toBe(MEMBER.ranges[FIRST_INDEX])
  })

  it('changes, adds, and removes ranges independently', () => {
    const state = createEditorState(MEMBER)
    const change = changeFirstRangeNote('call')
    const add: EditorAction = { kind: ADD_ACTION_KIND, weekday: MONDAY }
    const remove: EditorAction = { kind: REMOVE_ACTION_KIND, rangeIndex: SECOND_INDEX }
    const changed = applyEditorAction(state, change)
    const added = applyEditorAction(changed, add)
    const removed = applyEditorAction(added, remove)
    expect(removed.ranges).toHaveLength(2)
    expect(removed.ranges[FIRST_INDEX].note).toBe('call')
    expect(removed.ranges[SECOND_INDEX].note).toBe(EDITOR_COPY.emptyNote)
    expect(state.ranges[FIRST_INDEX].note).toBeNull()
  })

  it('strips identifiers and normalizes notes for the save DTO', () => {
    const state = createEditorState(MEMBER)
    const change: EditorAction = {
      kind: CHANGE_ACTION_KIND,
      rangeIndex: SECOND_INDEX,
      field: EDITOR_COPY.noteField,
      value: '  focus  ',
    }
    const changed = applyEditorAction(state, change)
    const expectedRanges = [
      {
        weekday: MONDAY,
        startsAt: '09:00',
        endsAt: '12:00',
        note: null,
      },
      {
        weekday: MONDAY,
        startsAt: '13:00',
        endsAt: '17:00',
        note: 'focus',
      },
    ]
    expect(toSaveRanges(changed)).toEqual(expectedRanges)
  })

  it('clears a stale saved/error message when the person edits, adds, or removes a range', () => {
    const settledState = {
      ...createEditorState(MEMBER),
      status: EDITOR_COPY.savedStatus,
      message: EDITOR_COPY.saved,
    }
    const add: EditorAction = { kind: ADD_ACTION_KIND, weekday: MONDAY }
    const remove: EditorAction = { kind: REMOVE_ACTION_KIND, rangeIndex: SECOND_INDEX }
    const settlingActions = [changeFirstRangeNote('call'), add, remove]
    const settledStates = settlingActions.map(action => applyEditorAction(settledState, action))

    settledStates.forEach(nextState => {
      expect(nextState.status).toBe(EDITOR_COPY.idleStatus)
      expect(nextState.message).toBeNull()
    })
  })

  it('leaves an in-flight save untouched when a range edit races it', () => {
    const savingState = { ...createEditorState(MEMBER), status: EDITOR_COPY.savingStatus }

    const changed = applyEditorAction(savingState, changeFirstRangeNote('call'))

    expect(changed.status).toBe(EDITOR_COPY.savingStatus)
  })
})

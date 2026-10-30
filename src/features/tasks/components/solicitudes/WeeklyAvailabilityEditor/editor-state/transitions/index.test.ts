import { describe, expect, it } from 'vitest'
import type {
  EditableRange,
  LocalEditorState,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type {
  AddRangeAction,
  ChangeRangeAction,
  RemoveRangeAction,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type { Weekday } from '@/features/tasks/utils/availability'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import createTransitionsFacade from './index'

const { changeRange, addRange, removeRange } = createTransitionsFacade()

const MONDAY: Weekday = 1
const FIRST_RANGE_INDEX = 0
const FIRST_RANGE: EditableRange = {
  clientId: 'range-1',
  weekday: MONDAY,
  startsAt: '09:00',
  endsAt: '12:00',
  note: null,
}
const BASE_STATE: LocalEditorState = {
  ranges: [FIRST_RANGE],
  status: EDITOR_COPY.idleStatus,
  message: EDITOR_COPY.emptyMessage,
  pendingRemoval: null,
}
const SETTLED_STATE: LocalEditorState = {
  ...BASE_STATE,
  status: EDITOR_COPY.savedStatus,
  message: EDITOR_COPY.saved,
}
const CHANGE_NOTE: ChangeRangeAction = {
  kind: 'change',
  rangeIndex: FIRST_RANGE_INDEX,
  field: EDITOR_COPY.noteField,
  value: 'call',
}
const ADD_MONDAY: AddRangeAction = { kind: 'add', weekday: MONDAY }
const REMOVE_FIRST: RemoveRangeAction = { kind: 'remove', rangeIndex: FIRST_RANGE_INDEX }

describe('WeeklyAvailabilityEditor editor-state transitions', () => {
  it('clears a stale status/message on change, add, and remove', () => {
    const afterChange = changeRange(SETTLED_STATE, CHANGE_NOTE)
    const afterAdd = addRange(SETTLED_STATE, ADD_MONDAY)
    const afterRemove = removeRange(SETTLED_STATE, REMOVE_FIRST)

    for (const nextState of [afterChange, afterAdd, afterRemove]) {
      expect(nextState.status).toBe(EDITOR_COPY.idleStatus)
      expect(nextState.message).toBeNull()
    }
  })

  it('leaves an in-flight save status untouched', () => {
    const savingState: LocalEditorState = { ...BASE_STATE, status: EDITOR_COPY.savingStatus }

    const afterChange = changeRange(savingState, CHANGE_NOTE)

    expect(afterChange.status).toBe(EDITOR_COPY.savingStatus)
  })
})

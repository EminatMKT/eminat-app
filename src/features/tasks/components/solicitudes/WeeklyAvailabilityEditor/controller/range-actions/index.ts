import type { LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type {
  AddRangeAction,
  ChangeRangeAction,
  RangeField,
  RemoveRangeAction,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type { Weekday } from '@/features/tasks/utils/availability'
import {
  ADD_ACTION_KIND,
  CHANGE_ACTION_KIND,
  REMOVE_ACTION_KIND,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-state/constants'
import createEditorStateFacade from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-state'
import {
  RANGE_INDEX_NOT_FOUND,
  type RangeIndexInput,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/range-index/types'
import createRangeIndexFacade from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/range-index'
import createExplicitTimesFacade from './explicit-times'

const { applyEditorAction } = createEditorStateFacade()
const { resolveRangeIndex } = createRangeIndexFacade()
const explicitTimesFacade = createExplicitTimesFacade()

const addRange = (state: LocalEditorState, weekday: Weekday): LocalEditorState => {
  const action: AddRangeAction = { kind: ADD_ACTION_KIND, weekday }
  const nextState = applyEditorAction(state, action)
  return nextState
}

const changeRange = (
  state: LocalEditorState,
  clientId: string,
  field: RangeField,
  value: string,
): LocalEditorState => {
  const input: RangeIndexInput = { ranges: state.ranges, clientId }
  const rangeIndex = resolveRangeIndex(input)
  if (rangeIndex === RANGE_INDEX_NOT_FOUND) return state
  const action: ChangeRangeAction = {
    kind: CHANGE_ACTION_KIND,
    rangeIndex,
    field,
    value,
  }
  const nextState = applyEditorAction(state, action)
  return nextState
}

const removeRange = (state: LocalEditorState, clientId: string): LocalEditorState => {
  const input: RangeIndexInput = { ranges: state.ranges, clientId }
  const rangeIndex = resolveRangeIndex(input)
  if (rangeIndex === RANGE_INDEX_NOT_FOUND) return state
  const action: RemoveRangeAction = { kind: REMOVE_ACTION_KIND, rangeIndex }
  const nextState = applyEditorAction(state, action)
  return nextState
}

export default function createRangeActionsFacade() {
  const facade = {
    addRange,
    changeRange,
    removeRange,
    ...explicitTimesFacade,
  }
  return facade
}

// This facade adapts client-id handlers to the editor state's index-based actions.

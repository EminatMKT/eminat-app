import type { LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type {
  AddRangeAction,
  ChangeRangeTimesAction,
  RangeTimes,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type { Weekday } from '@/features/tasks/utils/availability'
import {
  ADD_ACTION_KIND,
  CHANGE_TIMES_ACTION_KIND,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-state/constants'
import createEditorStateFacade from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-state'
import {
  RANGE_INDEX_NOT_FOUND,
  type RangeIndexInput,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/range-index/types'
import createRangeIndexFacade from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/range-index'

const { applyEditorAction } = createEditorStateFacade()
const { resolveRangeIndex } = createRangeIndexFacade()

const addRangeWithTimes = (
  state: LocalEditorState,
  weekday: Weekday,
  times: RangeTimes,
): LocalEditorState => {
  const { startsAt, endsAt } = times
  const action: AddRangeAction = {
    kind: ADD_ACTION_KIND,
    weekday,
    startsAt,
    endsAt,
  }
  const nextState = applyEditorAction(state, action)

  return nextState
}

const changeRangeTimes = (
  state: LocalEditorState,
  clientId: string,
  times: RangeTimes,
): LocalEditorState => {
  const input: RangeIndexInput = { ranges: state.ranges, clientId }
  const rangeIndex = resolveRangeIndex(input)

  if (rangeIndex === RANGE_INDEX_NOT_FOUND) return state

  const { startsAt, endsAt } = times
  const action: ChangeRangeTimesAction = {
    kind: CHANGE_TIMES_ACTION_KIND,
    rangeIndex,
    startsAt,
    endsAt,
  }
  const nextState = applyEditorAction(state, action)

  return nextState
}

export default function createExplicitTimesFacade() {
  const facade = { addRangeWithTimes, changeRangeTimes }

  return facade
}

// This facade adapts client-id handlers that already know exact snapped minutes (a grid
// click/drag/keyboard-create, a resize, a popover save) into the editor state's index-based
// actions — the explicit-time counterpart to `range-actions/index.ts`'s blank-default add and
// single-field change.

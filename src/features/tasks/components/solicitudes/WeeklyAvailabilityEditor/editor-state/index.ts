import type {
  AvailabilityMemberDto,
  SaveOwnAvailabilityRange,
} from '@/features/tasks/data/availability/types'
import type { EditorAction } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type { LocalEditorState } from '../component-types'
import EDITOR_COPY from '../constants'
import { ADD_ACTION_KIND, CHANGE_ACTION_KIND, CHANGE_TIMES_ACTION_KIND } from './constants'
import createTransitionsFacade from './transitions'
import changeRangeTimes from './transitions/change-range-times'

const { changeRange, addRange, removeRange } = createTransitionsFacade()

const createEditorState = ({ ranges: memberRanges }: AvailabilityMemberDto): LocalEditorState => {
  const state: LocalEditorState = {
    ranges: memberRanges.map(range => ({ ...range, clientId: range.id })),
    status: EDITOR_COPY.idleStatus,
    message: EDITOR_COPY.emptyMessage,
    pendingRemoval: null,
  }

  return state
}

const applyEditorAction = (...args: [LocalEditorState, EditorAction]): LocalEditorState => {
  const [state, action] = args
  if (action.kind === CHANGE_ACTION_KIND) return changeRange(state, action)
  if (action.kind === ADD_ACTION_KIND) return addRange(state, action)
  if (action.kind === CHANGE_TIMES_ACTION_KIND) return changeRangeTimes(state, action)

  return removeRange(state, action)
}

const toSaveRanges = ({ ranges }: LocalEditorState): SaveOwnAvailabilityRange[] => {
  const stripId = ({ id: _id, clientId: _clientId, ...range }: typeof ranges[number]) => ({
    ...range,
    note: range.note?.trim() || null,
  })
  const saveRanges = ranges.map(stripId)

  return saveRanges
}

export default function createEditorStateFacade() {
  const facade = { createEditorState, applyEditorAction, toSaveRanges }

  return facade
}

// This facade keeps initialization, save DTO preparation, and action dispatch behind one
// boundary; the change/add/remove transitions themselves live in ./transitions.

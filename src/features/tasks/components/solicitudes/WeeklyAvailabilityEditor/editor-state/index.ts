import type {
  AvailabilityMemberDto,
  SaveOwnAvailabilityRange,
} from '@/features/tasks/data/availability/types'
import type { EditorAction, TimedEditorAction } from '../types'
import type { LocalEditorState } from '../component-types/types'
import { EDITOR_COPY } from '../constants'
import { ADD_ACTION_KIND, CHANGE_ACTION_KIND, REMOVE_ACTION_KIND } from './constants'
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

const applyTimedAction = (...args: [LocalEditorState, TimedEditorAction]): LocalEditorState => {
  const [state, action] = args

  if (action.kind === ADD_ACTION_KIND) return addRange(state, action)

  return changeRangeTimes(state, action)
}

const applyEditorAction = (...args: [LocalEditorState, EditorAction]): LocalEditorState => {
  const [state, action] = args

  if (action.kind === CHANGE_ACTION_KIND) return changeRange(state, action)

  if (action.kind === REMOVE_ACTION_KIND) return removeRange(state, action)

  return applyTimedAction(state, action)
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

// One facade for initialization, save DTO preparation and dispatch; transitions: ./transitions.

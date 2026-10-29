import type {
  AvailabilityMemberDto,
  SaveOwnAvailabilityRange,
} from '@/features/tasks/data/availability/types'
import type {
  AddRangeAction,
  ChangeRangeAction,
  EditorAction,
  RemoveRangeAction,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type {
  EditableRange,
  LocalEditorState,
} from '../component-types'
import EDITOR_COPY from '../constants'
import {
  ADD_ACTION_KIND,
  CHANGE_ACTION_KIND,
  REMOVE_ACTION_KIND,
} from './constants'

const createEditorState = ({ ranges: memberRanges }: AvailabilityMemberDto): LocalEditorState => {
  const state: LocalEditorState = {
    ranges: memberRanges.map(range => ({ ...range, clientId: range.id })),
    status: EDITOR_COPY.idleStatus,
    message: EDITOR_COPY.emptyMessage,
    pendingRemoval: null,
  }
  return state
}

const changeRange = ({ ranges, ...state }: LocalEditorState, { rangeIndex, field, value }: ChangeRangeAction): LocalEditorState => {
  const currentRange = ranges[rangeIndex]
  if (!currentRange) return { ...state, ranges }
  const updatedRange: EditableRange = { ...currentRange, [field]: value }
  const nextRanges = [...ranges]; nextRanges[rangeIndex] = updatedRange
  return { ...state, ranges: nextRanges }
}

const addRange = ({ ranges, ...state }: LocalEditorState, { weekday }: AddRangeAction): LocalEditorState => {
  const range: EditableRange = {
    clientId: `${EDITOR_COPY.draftPrefix}-${crypto.randomUUID()}`,
    weekday,
    startsAt: EDITOR_COPY.defaultStart,
    endsAt: EDITOR_COPY.defaultEnd,
    note: EDITOR_COPY.emptyNote,
  }
  return { ...state, ranges: [...ranges, range] }
}

const removeRange = ({ ranges, ...state }: LocalEditorState, { rangeIndex }: RemoveRangeAction): LocalEditorState => {
  const isKept = (_range: EditableRange, index: number) => index !== rangeIndex; return { ...state, ranges: ranges.filter(isKept) }
}

const applyEditorAction = (...args: [LocalEditorState, EditorAction]): LocalEditorState => {
  const [state, action] = args
  if (action.kind === CHANGE_ACTION_KIND) return changeRange(state, action)
  if (action.kind === ADD_ACTION_KIND) return addRange(state, action)
  return removeRange(state, action)
}

const toSaveRanges = ({ ranges }: LocalEditorState): SaveOwnAvailabilityRange[] => {
  const saveRanges = ranges.map(({ id: _id, clientId: _clientId, ...range }) => ({ ...range, note: range.note?.trim() || null }))
  return saveRanges
}

export default function createEditorStateFacade() {
  const facade = { createEditorState, applyEditorAction, toSaveRanges }; return facade
}

// This facade keeps initialization, transitions, and save DTO preparation behind one boundary.

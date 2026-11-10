import type {
  AddRangeAction,
  ChangeRangeAction,
  RemoveRangeAction,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type {
  EditableRange,
  LocalEditorState,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import clearStaleFeedback from '../clear-stale-feedback'

const changeRange = (
  { ranges, ...state }: LocalEditorState,
  { rangeIndex, field, value }: ChangeRangeAction,
): LocalEditorState => {
  const currentRange = ranges[rangeIndex]

  if (!currentRange) return { ...state, ranges }

  const updatedRange: EditableRange = { ...currentRange, [field]: value }
  const nextRanges = [...ranges]

  nextRanges[rangeIndex] = updatedRange

  return { ...clearStaleFeedback(state), ranges: nextRanges }
}

const addRange = (
  { ranges, ...state }: LocalEditorState,
  { weekday, startsAt, endsAt }: AddRangeAction,
): LocalEditorState => {
  const range: EditableRange = {
    clientId: `${EDITOR_COPY.draftPrefix}-${crypto.randomUUID()}`,
    weekday,
    startsAt: startsAt ?? EDITOR_COPY.defaultStart,
    endsAt: endsAt ?? EDITOR_COPY.defaultEnd,
    note: EDITOR_COPY.emptyNote,
  }

  return { ...clearStaleFeedback(state), ranges: [...ranges, range] }
}

const removeRange = (
  { ranges, ...state }: LocalEditorState,
  { rangeIndex }: RemoveRangeAction,
): LocalEditorState => {
  const isKept = (_range: EditableRange, index: number) => index !== rangeIndex

  return { ...clearStaleFeedback(state), ranges: ranges.filter(isKept) }
}

export default function createTransitionsFacade() {
  const facade = { changeRange, addRange, removeRange }

  return facade
}

// This facade owns the three index-based editor transitions editor-state/index.ts applies:
// changing a field, adding a draft range, and removing one. The fourth transition, resizing
// both ends at once, lives standalone in ./change-range-times — editor-state/index.ts applies
// it directly rather than growing this facade's object past three inline members.

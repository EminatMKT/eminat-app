import type {
  EditableRange,
  LocalEditorState,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { ChangeRangeTimesAction } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import clearStaleFeedback from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-state/clear-stale-feedback'

/** Commits a resize or a popover save: both `startsAt` and `endsAt` land in one transition, so
 *  there is never an observable moment where only one end has moved. */
export default function changeRangeTimes(
  { ranges, ...state }: LocalEditorState,
  { rangeIndex, startsAt, endsAt }: ChangeRangeTimesAction,
): LocalEditorState {
  const currentRange = ranges[rangeIndex]

  if (!currentRange) return { ...state, ranges }

  const updatedRange: EditableRange = { ...currentRange, startsAt, endsAt }
  const nextRanges = [...ranges]

  nextRanges[rangeIndex] = updatedRange

  return { ...clearStaleFeedback(state), ranges: nextRanges }
}

// This module is the one transition that moves both ends of a range together.

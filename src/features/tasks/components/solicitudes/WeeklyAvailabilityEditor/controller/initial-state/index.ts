import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import type { LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import createEditorStateFacade from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-state'

const { createEditorState } = createEditorStateFacade()

/** Creates the editor's local state from the persisted availability member. */
const createInitialEditorState = (
  member: AvailabilityMemberDto,
): LocalEditorState => {
  const state = createEditorState(member)

  return state
}

export default createInitialEditorState

// This module creates the initial local editor state from member availability.

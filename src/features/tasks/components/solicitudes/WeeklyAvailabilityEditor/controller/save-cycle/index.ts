import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import type { LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import applySaveOutcome from '../apply-save-outcome'
import createInitialEditorState from '../initial-state'
import type { SaveOutcome } from '../save-decision/types'
import type { ControllerState } from './types'

const INITIAL_FOCUS_TOKEN = 0
const FOCUS_TOKEN_STEP = 1

const createInitialControllerState = (member: AvailabilityMemberDto): ControllerState => {
  const editor = createInitialEditorState(member)
  return { editor, focusToken: INITIAL_FOCUS_TOKEN }
}

const buildSavingState = ({ editor, focusToken }: ControllerState): ControllerState => {
  const nextEditor: LocalEditorState = { ...editor, status: EDITOR_COPY.savingStatus }
  return { editor: nextEditor, focusToken }
}

const buildFailureState = ({ editor, focusToken }: ControllerState): ControllerState => {
  const nextEditor: LocalEditorState = { ...editor, status: EDITOR_COPY.errorStatus, message: EDITOR_COPY.saveError }
  return { editor: nextEditor, focusToken }
}

const applyOutcome = ({ editor, focusToken }: ControllerState, outcome: SaveOutcome): ControllerState => {
  const { status, message, shouldBumpFocusToken } = applySaveOutcome(outcome)
  const nextEditor: LocalEditorState = { ...editor, status, message }
  const step = shouldBumpFocusToken ? FOCUS_TOKEN_STEP : EDITOR_COPY.zeroHours
  return { editor: nextEditor, focusToken: focusToken + step }
}

export default function createSaveCycleFacade() {
  const facade = {
    createInitialControllerState,
    buildSavingState,
    buildFailureState,
    applyOutcome,
  }
  return facade
}

// This facade keeps the controller's combined editor-and-focus-token transitions behind one boundary.

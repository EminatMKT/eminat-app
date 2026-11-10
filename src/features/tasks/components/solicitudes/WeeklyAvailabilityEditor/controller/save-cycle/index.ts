import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import type {
  EditableRange,
  LocalEditorState,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import applySaveOutcome from '../apply-save-outcome'
import createInitialEditorState from '../initial-state'
import { SAVE_SUCCESS } from '../constants'
import type { SaveOutcome } from '../save-decision/types'
import type { ControllerState } from './types'

const INITIAL_FOCUS_TOKEN = 0
const FOCUS_TOKEN_STEP = 1
const FAILURE_FEEDBACK = { status: EDITOR_COPY.errorStatus, message: EDITOR_COPY.saveError }

const createInitialControllerState = (member: AvailabilityMemberDto): ControllerState => {
  const editor = createInitialEditorState(member)

  return { editor, focusToken: INITIAL_FOCUS_TOKEN, savedRanges: editor.ranges }
}

const buildSavingState = (previous: ControllerState): ControllerState => {
  const nextEditor: LocalEditorState = { ...previous.editor, status: EDITOR_COPY.savingStatus }

  return { ...previous, editor: nextEditor }
}

const buildFailureState = (previous: ControllerState): ControllerState => {
  const { editor } = previous
  const nextEditor: LocalEditorState = { ...editor, ...FAILURE_FEEDBACK }

  return { ...previous, editor: nextEditor }
}

const nextSavedRanges = (previous: ControllerState, outcome: SaveOutcome): EditableRange[] =>
  outcome.kind === SAVE_SUCCESS ? previous.editor.ranges : previous.savedRanges

const applyOutcome = (previous: ControllerState, outcome: SaveOutcome): ControllerState => {
  const { editor, focusToken } = previous
  const { status, message, shouldBumpFocusToken } = applySaveOutcome(outcome)
  const nextEditor: LocalEditorState = { ...editor, status, message }
  const step = shouldBumpFocusToken ? FOCUS_TOKEN_STEP : EDITOR_COPY.zeroHours
  const savedRanges = nextSavedRanges(previous, outcome)

  return { editor: nextEditor, focusToken: focusToken + step, savedRanges }
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

// This facade keeps the controller's combined editor-and-focus-token transitions behind one
// boundary.

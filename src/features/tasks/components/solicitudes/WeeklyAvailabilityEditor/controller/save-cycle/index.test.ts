import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityMemberDto, AvailabilityResponse } from '@/features/tasks/data/availability/types'
import type { EditableRange, LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type {
  SaveFailureOutcome,
  SaveSuccessOutcome,
  ValidationFailureOutcome,
} from '../save-decision/types'
import createSaveCycleFacade from './index'
import type { ControllerState } from './types'

const {
  createInitialControllerState,
  buildSavingState,
  buildFailureState,
  applyOutcome,
} = createSaveCycleFacade()

const MEMBER_RANGE = {
  id: 'monday-1',
  weekday: 1 as const,
  startsAt: '09:00',
  endsAt: '13:00',
  note: null,
}
const MEMBER: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana López',
  team: null,
  workday: null,
  ranges: [MEMBER_RANGE],
  canEdit: true,
}
const SOME_FOCUS_TOKEN = 2
const FOCUS_TOKEN_STEP = 1
const UNEXPECTED_FAILURE_MESSAGE = 'save cycle blew up'
const UNEXPECTED_FAILURE = new Error(UNEXPECTED_FAILURE_MESSAGE)
const SAVED_RESPONSE: AvailabilityResponse = { viewerUserId: 'viewer-1', members: [] }
const PRE_SAVE_RANGE: EditableRange = {
  clientId: 'monday-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '13:00',
  note: null,
}
const LIVE_EDITED_RANGE: EditableRange = {
  clientId: 'monday-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '14:00',
  note: 'edited mid-flight',
}
const PRE_SAVE_SNAPSHOT: LocalEditorState = {
  ranges: [PRE_SAVE_RANGE],
  status: EDITOR_COPY.idleStatus,
  message: null,
  pendingRemoval: null,
}
const LIVE_EDITED_STATE: LocalEditorState = {
  ranges: [LIVE_EDITED_RANGE],
  status: EDITOR_COPY.savingStatus,
  message: null,
  pendingRemoval: null,
}
const LIVE_PREVIOUS: ControllerState = {
  editor: LIVE_EDITED_STATE,
  focusToken: 0,
  savedRanges: [PRE_SAVE_RANGE],
}

describe('save cycle facade', () => {
  it('builds the initial controller state from the member with a zeroed focus token', () => {
    const state = createInitialControllerState(MEMBER)

    expect(state.editor.ranges).toHaveLength(1)
    expect(state.focusToken).toBe(0)
  })

  it('seeds the saved-ranges baseline from the same ranges the editor starts with', () => {
    const state = createInitialControllerState(MEMBER)

    expect(state.savedRanges).toBe(state.editor.ranges)
  })

  it('marks the editor as saving without touching the focus token', () => {
    const initial = createInitialControllerState(MEMBER)
    const previous = { ...initial, focusToken: SOME_FOCUS_TOKEN }

    const next = buildSavingState(previous)

    expect(next.editor.status).toBe(EDITOR_COPY.savingStatus)
    expect(next.focusToken).toBe(SOME_FOCUS_TOKEN)
  })

  it('marks the editor as failed without touching the focus token', () => {
    const previous = createInitialControllerState(MEMBER)

    const next = buildFailureState(previous)

    expect(next.editor.status).toBe(EDITOR_COPY.errorStatus)
    expect(next.editor.message).toBe(EDITOR_COPY.saveError)
    expect(next.focusToken).toBe(previous.focusToken)
  })

  it('bumps the focus token only when the outcome asks for it', () => {
    const previous = createInitialControllerState(MEMBER)
    const validationOutcome: ValidationFailureOutcome = {
      kind: 'validation-failure',
      state: previous.editor,
      errors: [],
      shouldFocusValidation: true,
    }

    const next = applyOutcome(previous, validationOutcome)

    expect(next.focusToken).toBe(previous.focusToken + FOCUS_TOKEN_STEP)
  })

  it('keeps the focus token steady on a save failure outcome', () => {
    const previous = createInitialControllerState(MEMBER)
    const failureOutcome: SaveFailureOutcome = {
      kind: 'save-failure',
      state: previous.editor,
      error: UNEXPECTED_FAILURE,
      shouldFocusValidation: false,
    }

    const next = applyOutcome(previous, failureOutcome)

    expect(next.focusToken).toBe(previous.focusToken)
  })

  it('keeps ranges edited during the in-flight request on a save-success outcome, not the pre-save snapshot', () => {
    const successOutcome: SaveSuccessOutcome = {
      kind: 'save-success',
      state: PRE_SAVE_SNAPSHOT,
      response: SAVED_RESPONSE,
      onSaved: vi.fn(),
      shouldFocusValidation: false,
    }

    const next = applyOutcome(LIVE_PREVIOUS, successOutcome)

    expect(next.editor.ranges).toBe(LIVE_EDITED_STATE.ranges)
    expect(next.editor.status).toBe(EDITOR_COPY.savedStatus)
  })

  it('keeps ranges edited during the in-flight request on a save-failure outcome, not the pre-save snapshot', () => {
    const failureOutcome: SaveFailureOutcome = {
      kind: 'save-failure',
      state: PRE_SAVE_SNAPSHOT,
      error: UNEXPECTED_FAILURE,
      shouldFocusValidation: false,
    }

    const next = applyOutcome(LIVE_PREVIOUS, failureOutcome)

    expect(next.editor.ranges).toBe(LIVE_EDITED_STATE.ranges)
    expect(next.editor.status).toBe(EDITOR_COPY.errorStatus)
  })
})

// Verifies the facade's own composition; applySaveOutcome's own branches have their own unit.

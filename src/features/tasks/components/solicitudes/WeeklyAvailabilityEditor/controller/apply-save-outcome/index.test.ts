import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import type { LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type {
  SaveFailureOutcome,
  SaveSuccessOutcome,
  ValidationFailureOutcome,
} from '../save-decision/types'
import applySaveOutcome from './index'

const PRE_SAVE_SNAPSHOT: LocalEditorState = {
  ranges: [],
  status: EDITOR_COPY.idleStatus,
  message: null,
  pendingRemoval: null,
}
const SAVED_RESPONSE: AvailabilityResponse = { viewerUserId: 'viewer-1', members: [] }
const UNEXPECTED_FAILURE = new Error('save failed')

describe('applySaveOutcome', () => {
  it('reports the validation status/message and bumps the focus token, without touching ranges', () => {
    const outcome: ValidationFailureOutcome = {
      kind: 'validation-failure',
      state: PRE_SAVE_SNAPSHOT,
      errors: [],
      shouldFocusValidation: true,
    }

    const result = applySaveOutcome(outcome)

    expect(result.status).toBe(EDITOR_COPY.idleStatus)
    expect(result.message).toBe(EDITOR_COPY.validationError)
    expect(result.shouldBumpFocusToken).toBe(true)
    expect(result).not.toHaveProperty('state')
  })

  it('reports success without calling onSaved itself or bumping the focus token', () => {
    const onSaved = vi.fn()
    const outcome: SaveSuccessOutcome = {
      kind: 'save-success',
      state: PRE_SAVE_SNAPSHOT,
      response: SAVED_RESPONSE,
      onSaved,
      shouldFocusValidation: false,
    }

    const result = applySaveOutcome(outcome)

    expect(onSaved).not.toHaveBeenCalled()
    expect(result.status).toBe(EDITOR_COPY.savedStatus)
    expect(result.message).toBe(EDITOR_COPY.saved)
    expect(result.shouldBumpFocusToken).toBe(false)
  })

  it('reports the failure status/message, without bumping the focus token', () => {
    const outcome: SaveFailureOutcome = {
      kind: 'save-failure',
      state: PRE_SAVE_SNAPSHOT,
      error: UNEXPECTED_FAILURE,
      shouldFocusValidation: false,
    }

    const result = applySaveOutcome(outcome)

    expect(result.status).toBe(EDITOR_COPY.errorStatus)
    expect(result.message).toBe(EDITOR_COPY.saveError)
    expect(result.shouldBumpFocusToken).toBe(false)
  })
})

// This unit maps outcome to status/message/focus only; save-cycle merges it onto the LIVE editor
// state so in-flight edits made during the request are never overwritten by the pre-save snapshot.

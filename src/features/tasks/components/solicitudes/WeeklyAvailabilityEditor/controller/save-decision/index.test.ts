import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type {
  LocalEditorState,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type {
  SaveFlowFailure,
  SaveFlowSuccess,
  SaveFlowValidation,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/save-flow/types'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import decideSaveOutcome from './index'
import {
  SAVE_FAILURE,
  SAVE_SUCCESS,
  VALIDATION_FAILURE,
} from '../constants'

const UNEXPECTED_KIND_MESSAGE = 'Unexpected decideSaveOutcome kind'
const NETWORK_ERROR_MESSAGE = 'network'
const RESPONSE = { viewerUserId: 'viewer-1', members: [] }
const ERROR = new Error(NETWORK_ERROR_MESSAGE)
const STATE: LocalEditorState = {
  ranges: [],
  status: EDITOR_COPY.idleStatus,
  message: EDITOR_COPY.emptyMessage,
  pendingRemoval: null,
}
const onSaved = vi.fn()
const VALIDATION_RESULT: SaveFlowValidation = { errors: [{ code: 'end-not-after-start', rangeIndex: 0 }] }
const SUCCESS_RESULT: SaveFlowSuccess = { response: RESPONSE }
const FAILURE_RESULT: SaveFlowFailure = { error: ERROR }

describe('WeeklyAvailabilityEditor save decision', () => {
  it('returns a validation failure decision', () => {
    const result = decideSaveOutcome({ state: STATE, result: VALIDATION_RESULT, onSaved })

    expect(result.kind).toBe(VALIDATION_FAILURE)
    expect(result.state).toBe(STATE)
    expect(result.shouldFocusValidation).toBe(true)
  })

  it('returns a save success decision with the callback', () => {
    const result = decideSaveOutcome({ state: STATE, result: SUCCESS_RESULT, onSaved })

    expect(result.kind).toBe(SAVE_SUCCESS)

    if (result.kind !== SAVE_SUCCESS) throw new Error(UNEXPECTED_KIND_MESSAGE)

    expect(result.response).toBe(RESPONSE)
    expect(result.onSaved).toBe(onSaved)
  })

  it('returns a save failure decision', () => {
    const result = decideSaveOutcome({ state: STATE, result: FAILURE_RESULT, onSaved })

    expect(result.kind).toBe(SAVE_FAILURE)

    if (result.kind !== SAVE_FAILURE) throw new Error(UNEXPECTED_KIND_MESSAGE)

    expect(result.error).toBe(ERROR)
    expect(result.shouldFocusValidation).toBe(false)
  })
})

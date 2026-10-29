import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import type { LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import saveAvailability from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/save-flow'
import type { SaveFlowResult } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/save-flow/types'
import type {
  SaveFailureKind,
  SaveSuccessKind,
  ValidationFailureKind,
} from '../save-decision/types'
import resolveSaveOutcome from './index'

vi.mock('@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/save-flow', () => ({
  default: vi.fn(),
}))

const VALIDATION_FAILURE: ValidationFailureKind = 'validation-failure'
const SAVE_SUCCESS: SaveSuccessKind = 'save-success'
const SAVE_FAILURE: SaveFailureKind = 'save-failure'

const BASE_STATE: LocalEditorState = {
  ranges: [],
  status: EDITOR_COPY.idleStatus,
  message: null,
  pendingRemoval: null,
}
const SAVED_RESPONSE: AvailabilityResponse = { viewerUserId: 'viewer-1', members: [] }
const UNEXPECTED_REJECTION = new Error('unexpected failure')

describe('resolveSaveOutcome', () => {
  it('reports validation failure when the save flow finds invalid ranges', async () => {
    const validationResult: SaveFlowResult = { errors: [] }
    vi.mocked(saveAvailability).mockResolvedValueOnce(validationResult)

    const outcome = await resolveSaveOutcome({ state: BASE_STATE, onSaved: vi.fn() })

    expect(outcome.kind).toBe(VALIDATION_FAILURE)
  })

  it('carries the response and onSaved through on a successful save', async () => {
    const successResult: SaveFlowResult = { response: SAVED_RESPONSE }
    vi.mocked(saveAvailability).mockResolvedValueOnce(successResult)
    const onSaved = vi.fn()

    const outcome = await resolveSaveOutcome({ state: BASE_STATE, onSaved })

    expect(outcome.kind).toBe(SAVE_SUCCESS)
    if (outcome.kind === SAVE_SUCCESS) {
      expect(outcome.response).toBe(SAVED_RESPONSE)
      expect(outcome.onSaved).toBe(onSaved)
    }
  })

  it('converts an unexpected rejection into a save-failure outcome instead of rethrowing', async () => {
    vi.mocked(saveAvailability).mockRejectedValueOnce(UNEXPECTED_REJECTION)

    const outcome = await resolveSaveOutcome({ state: BASE_STATE, onSaved: vi.fn() })

    expect(outcome.kind).toBe(SAVE_FAILURE)
  })
})

// Mocks the save-flow boundary directly to exercise resolveSaveOutcome's own branching and catch.

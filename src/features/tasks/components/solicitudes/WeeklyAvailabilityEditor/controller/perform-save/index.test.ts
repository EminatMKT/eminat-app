import type { Dispatch, SetStateAction } from 'react'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import type {
  LocalEditorState,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import * as resolveSaveOutcomeModule from '../resolve-save-outcome'
import type { SaveSuccessOutcome } from '../save-decision/types'
import type { ControllerState } from '../save-cycle/types'
import performSave from './index'
import type { PerformSaveInput } from './types'

const DEFAULT_EXPORT = 'default'

const INITIAL_EDITOR: LocalEditorState = {
  ranges: [],
  status: EDITOR_COPY.idleStatus,
  message: null,
  pendingRemoval: null,
}
const INITIAL_STATE: ControllerState = { editor: INITIAL_EDITOR, focusToken: 0, savedRanges: [] }
const SAVED_RESPONSE: AvailabilityResponse = { viewerUserId: 'viewer-1', members: [] }

function trackControllerState(initial: ControllerState) {
  let current = initial
  const setControllerState: Dispatch<SetStateAction<ControllerState>> = update => {
    current = typeof update === 'function' ? update(current) : update
  }

  return { setControllerState, getState: () => current }
}

describe('performSave', () => {
  it('resolves true, calls onSaved, and marks the state as saved on success', async () => {
    const onSaved = vi.fn()
    const tracker = trackControllerState(INITIAL_STATE)
    const successOutcome: SaveSuccessOutcome = {
      kind: 'save-success',
      state: INITIAL_EDITOR,
      response: SAVED_RESPONSE,
      onSaved,
      shouldFocusValidation: false,
    }

    vi.spyOn(resolveSaveOutcomeModule, DEFAULT_EXPORT).mockResolvedValueOnce(successOutcome)
    const input: PerformSaveInput = {
      editor: INITIAL_EDITOR,
      onSaved,
      setControllerState: tracker.setControllerState,
    }

    const result = await performSave(input)

    expect(result).toBe(true)
    expect(onSaved).toHaveBeenCalledWith(SAVED_RESPONSE)
    expect(tracker.getState().editor.status).toBe(EDITOR_COPY.savedStatus)
  })

  it('resolves false and marks the state as failed when the save rejects', async () => {
    const onSaved = vi.fn()
    const tracker = trackControllerState(INITIAL_STATE)
    const rejection = new Error()

    vi.spyOn(resolveSaveOutcomeModule, DEFAULT_EXPORT).mockRejectedValueOnce(rejection)
    const input: PerformSaveInput = {
      editor: INITIAL_EDITOR,
      onSaved,
      setControllerState: tracker.setControllerState,
    }

    const result = await performSave(input)

    expect(result).toBe(false)
    expect(onSaved).not.toHaveBeenCalled()
    expect(tracker.getState().editor.status).toBe(EDITOR_COPY.errorStatus)
  })
})

// Exercises performSave in isolation so controller/index.ts can delegate to it as one call.

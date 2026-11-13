import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { LocalEditorState } from '../component-types/types'
import type { ControllerResult } from '../controller/types'
import { EDITOR_COPY } from '../constants'
import buildActionsProps from './index'

const STATUS = EDITOR_COPY.idleStatus
const MESSAGE = null
const onCancel = vi.fn()
const onSave = vi.fn()
const STATE: LocalEditorState = {
  ranges: [],
  status: STATUS,
  message: MESSAGE,
  pendingRemoval: null,
}
const CONTROLLER: ControllerResult = {
  state: STATE,
  errors: [],
  isDirty: false,
  onChangeRanges: vi.fn(),
  onSave,
  onCancel,
}

describe('buildActionsProps', () => {
  it('derives EditorActions props, wrapping onSave so it never returns a promise', () => {
    const actionsProps = buildActionsProps(CONTROLLER)

    expect(actionsProps.status).toBe(STATUS)
    expect(actionsProps.message).toBe(MESSAGE)
    expect(actionsProps.onCancel).toBe(onCancel)

    actionsProps.onSave()

    expect(onSave).toHaveBeenCalledTimes(1)
  })
})

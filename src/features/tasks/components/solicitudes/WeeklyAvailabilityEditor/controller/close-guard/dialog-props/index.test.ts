import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import buildDialogProps from './index'

describe('buildDialogProps', () => {
  it('wires onDiscard to close immediately', () => {
    const onClose = vi.fn()
    const setConfirming = vi.fn()
    const dialogProps = buildDialogProps(vi.fn(), onClose, setConfirming)

    dialogProps.onDiscard()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('wires onKeepEditing to clear the confirm flag only', () => {
    const onClose = vi.fn()
    const setConfirming = vi.fn()
    const dialogProps = buildDialogProps(vi.fn(), onClose, setConfirming)

    dialogProps.onKeepEditing()

    expect(setConfirming).toHaveBeenCalledWith(false)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('wires onSaveAndExit to the injected save callback', () => {
    const onClose = vi.fn()
    const setConfirming = vi.fn()
    const onSave = vi.fn().mockResolvedValue(true)
    const dialogProps = buildDialogProps(onSave, onClose, setConfirming)

    void dialogProps.onSaveAndExit()

    expect(onSave).toHaveBeenCalledTimes(1)
  })
})

// Confirms the three dialog actions reach the right helper, not re-testing their own logic.

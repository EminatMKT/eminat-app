import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import saveAndExit from './index'

describe('saveAndExit', () => {
  it('closes once the save resolves true', async () => {
    const onClose = vi.fn()
    const setConfirming = vi.fn()
    const onSave = vi.fn().mockResolvedValue(true)

    await saveAndExit(onSave, onClose, setConfirming)

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(setConfirming).toHaveBeenCalledWith(false)
  })

  it('stays open but clears the confirm flag when the save resolves false', async () => {
    const onClose = vi.fn()
    const setConfirming = vi.fn()
    const onSave = vi.fn().mockResolvedValue(false)

    await saveAndExit(onSave, onClose, setConfirming)

    expect(onClose).not.toHaveBeenCalled()
    expect(setConfirming).toHaveBeenCalledWith(false)
  })

  it('clears the confirm flag and rethrows when the save rejects', async () => {
    const onClose = vi.fn()
    const setConfirming = vi.fn()
    // Identity, not message: the very rejection the save threw must reach the caller unwrapped.
    const rejection = new Error()
    const onSave = vi.fn().mockRejectedValue(rejection)

    await expect(saveAndExit(onSave, onClose, setConfirming)).rejects.toBe(rejection)

    expect(setConfirming).toHaveBeenCalledWith(false)
    expect(onClose).not.toHaveBeenCalled()
  })
})

// Exercises the rejection branch too, since the hook's own Probe test can't reach it.

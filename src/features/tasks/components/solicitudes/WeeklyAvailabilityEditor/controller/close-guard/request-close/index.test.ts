import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import requestClose from './index'

describe('requestClose', () => {
  it('closes immediately when not dirty', () => {
    const onClose = vi.fn()
    const setConfirming = vi.fn()

    requestClose(false, onClose, setConfirming)

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(setConfirming).not.toHaveBeenCalled()
  })

  it('opens the confirm dialog when dirty', () => {
    const onClose = vi.fn()
    const setConfirming = vi.fn()

    requestClose(true, onClose, setConfirming)

    expect(onClose).not.toHaveBeenCalled()
    expect(setConfirming).toHaveBeenCalledWith(true)
  })
})

// Pure branch: closes when nothing is at risk, otherwise defers to the confirm dialog.

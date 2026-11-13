import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import discard from './index'

describe('discard', () => {
  it('closes and clears the confirm flag', () => {
    const onClose = vi.fn()
    const setConfirming = vi.fn()

    discard(onClose, setConfirming)

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(setConfirming).toHaveBeenCalledWith(false)
  })
})

// Discarding never waits on a save: it closes right away and drops the confirm step.

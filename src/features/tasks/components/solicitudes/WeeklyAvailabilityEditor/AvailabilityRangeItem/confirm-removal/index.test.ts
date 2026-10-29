import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import confirmRemoval from './index'

const MESSAGE = 'Remove this availability range?'

describe('confirmRemoval', () => {
  it('does not remove when confirmation is cancelled', () => {
    const remove = vi.fn()
    const cancel = () => false

    confirmRemoval(MESSAGE, remove, cancel)

    expect(remove).not.toHaveBeenCalled()
  })

  it('removes only after confirmation', () => {
    const remove = vi.fn()
    const confirm = () => true

    confirmRemoval(MESSAGE, remove, confirm)

    expect(remove).toHaveBeenCalledOnce()
  })
})

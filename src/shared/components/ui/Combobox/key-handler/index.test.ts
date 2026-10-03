import { describe, it, expect, vi } from 'vitest'
import CLOSED from '../closed'
import keyHandler from './index'

const OPTIONS = ['a', 'b']
const press = (key: string) => ({ key, preventDefault: vi.fn(), stopPropagation: vi.fn() })

const setup = (multiple: boolean, active: number) => {
  const wiring = {
    state: { open: true, active },
    setState: vi.fn(),
    shown: OPTIONS,
    multiple,
    onPick: vi.fn(),
  }
  return { wiring, handle: keyHandler(wiring) }
}

describe('keyHandler', () => {
  it('Escape closes and keeps the key from the dialog around', () => {
    const { wiring, handle } = setup(false, -1)
    const event = press('Escape')
    handle(event)
    expect(wiring.setState).toHaveBeenCalledWith(CLOSED)
    expect(event.stopPropagation).toHaveBeenCalled()
  })

  it('Enter hands the highlighted option to the picker', () => {
    const { wiring, handle } = setup(true, 1)
    handle(press('Enter'))
    expect(wiring.onPick).toHaveBeenCalledWith('b')
  })

  it('a letter is left to the box', () => {
    const { wiring, handle } = setup(true, 1)
    const event = press('x')
    handle(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(wiring.onPick).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi } from 'vitest'
import dialogKeys from './index'

const target = () => ({ focus: vi.fn() })
const press = (key: string, shiftKey = false) => ({ key, shiftKey, cancel: vi.fn(), stop: vi.fn() })

describe('dialogKeys', () => {
  it('closes on Escape, and the dialog around it does not hear it', () => {
    const onClose = vi.fn()
    const event = press('Escape')
    dialogKeys(event, { items: [], active: null, onClose })
    expect(onClose).toHaveBeenCalledOnce()
    expect(event.stop).toHaveBeenCalled()
  })

  it('wraps Tab from the last control back to the first', () => {
    const [first, last] = [target(), target()]
    const event = press('Tab')
    dialogKeys(event, { items: [first, last], active: last, onClose: vi.fn() })
    expect(event.cancel).toHaveBeenCalled()
    expect(first.focus).toHaveBeenCalled()
  })

  it('wraps Shift+Tab from the first control to the last', () => {
    const [first, last] = [target(), target()]
    const event = press('Tab', true)
    dialogKeys(event, { items: [first, last], active: first, onClose: vi.fn() })
    expect(event.cancel).toHaveBeenCalled()
    expect(last.focus).toHaveBeenCalled()
  })

  // The browser already moves between two controls of the dialog; only the edges need a hand.
  it('lets Tab move by itself between controls in the middle', () => {
    const [first, middle, last] = [target(), target(), target()]
    const event = press('Tab')
    dialogKeys(event, { items: [first, middle, last], active: middle, onClose: vi.fn() })
    expect(event.cancel).not.toHaveBeenCalled()
    expect(last.focus).not.toHaveBeenCalled()
  })

  // Focus on the box itself (nothing focusable was picked) still cannot leak to the page.
  it('brings a focus that is on no control to the edge Tab points at', () => {
    const [first, last] = [target(), target()]
    dialogKeys(press('Tab'), { items: [first, last], active: null, onClose: vi.fn() })
    dialogKeys(press('Tab', true), { items: [first, last], active: null, onClose: vi.fn() })
    expect(first.focus).toHaveBeenCalledOnce()
    expect(last.focus).toHaveBeenCalledOnce()
  })

  it('keeps Tab inside a dialog with nothing to focus', () => {
    const event = press('Tab')
    dialogKeys(event, { items: [], active: null, onClose: vi.fn() })
    expect(event.cancel).toHaveBeenCalled()
  })

  it('leaves every other key to the control that has the focus', () => {
    const onClose = vi.fn()
    const event = press('Enter')
    dialogKeys(event, { items: [target()], active: null, onClose })
    expect(onClose).not.toHaveBeenCalled()
    expect(event.cancel).not.toHaveBeenCalled()
  })
})

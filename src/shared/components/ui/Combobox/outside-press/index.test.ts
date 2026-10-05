import { describe, it, expect, vi, afterEach } from 'vitest'
import CLOSED from '../closed'
import closeOnOutsidePress from './index'

class FakeNode {}
type Listener = (press: Record<'target', unknown>) => void
const listeners: Listener[] = []
const fakeDocument = {
  addEventListener: (_: string, listener: Listener) => { listeners.push(listener) },
  removeEventListener: vi.fn(),
}
const inside = new FakeNode()
const outside = new FakeNode()
const root = { current: { contains: (target: unknown) => target === inside } }

describe('closeOnOutsidePress', () => {
  afterEach(() => { vi.unstubAllGlobals(); listeners.length = 0 })

  it('closes on a press outside the root and not on one inside', () => {
    vi.stubGlobal('document', fakeDocument)
    vi.stubGlobal('Node', FakeNode)
    const close = vi.fn()
    const stop = closeOnOutsidePress(root, close)
    listeners[0]({ target: inside })
    expect(close).not.toHaveBeenCalled()
    listeners[0]({ target: outside })
    expect(close).toHaveBeenCalledWith(CLOSED)
    stop()
    expect(fakeDocument.removeEventListener).toHaveBeenCalled()
  })
})

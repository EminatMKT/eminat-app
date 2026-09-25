import { describe, it, expect, vi } from 'vitest'
import holdFocus from './index'

const control = (isConnected = true) => ({ focus: vi.fn(), isConnected })
const box = (holds: unknown = undefined) => ({ focus: vi.fn(), contains: (node: unknown) => node === holds })

describe('holdFocus', () => {
  it('moves the focus inside, to the first control, on open', () => {
    const [opener, first, dialog] = [control(), control(), box()]
    holdFocus({ box: dialog, first, active: opener, opener })
    expect(first.focus).toHaveBeenCalled()
    expect(dialog.focus).not.toHaveBeenCalled()
  })

  it('takes the focus to the dialog itself when it has nothing to focus', () => {
    const [opener, dialog] = [control(), box()]
    holdFocus({ box: dialog, first: undefined, active: opener, opener })
    expect(dialog.focus).toHaveBeenCalled()
  })

  // A field marked autoFocus already took it: moving it again would undo the caller's choice.
  it('leaves the focus where a field of the dialog already took it', () => {
    const [opener, typed, first] = [control(), control(), control()]
    holdFocus({ box: box(typed), first, active: typed, opener })
    expect(first.focus).not.toHaveBeenCalled()
  })

  it('gives the focus back to the control that opened it, on close', () => {
    const [opener, first] = [control(), control()]
    const release = holdFocus({ box: box(), first, active: opener, opener })
    release()
    expect(opener.focus).toHaveBeenCalledOnce()
  })

  // The opener may be gone by then (its row was deleted): focusing a detached node does nothing
  // useful, and there was nothing to return to.
  it('gives nothing back when the opener left the page', () => {
    const opener = control(false)
    const release = holdFocus({ box: box(), first: control(), active: opener, opener })
    release()
    expect(opener.focus).not.toHaveBeenCalled()
  })
})

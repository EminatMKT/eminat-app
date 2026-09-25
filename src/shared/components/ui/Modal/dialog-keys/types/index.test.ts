import { describe, expectTypeOf, it } from 'vitest'
import type { Dialog, Focusable, KeyPress } from './index'

const ignore = () => undefined
const KEY = 'Tab'

describe('dialog-keys types', () => {
  // The real controls are DOM elements; the tests hand in plain objects. Both have to fit.
  it('takes any DOM element as a control to focus', () => {
    expectTypeOf<HTMLElement>().toMatchTypeOf<Focusable>()
    const dialog: Dialog = { items: [], active: null, onClose: ignore }
    expectTypeOf(dialog.items).toEqualTypeOf<Focusable[]>()
  })

  it('answers a key press through closures, never through the event itself', () => {
    const press: KeyPress = { key: KEY, shiftKey: false, cancel: ignore, stop: ignore }
    expectTypeOf(press.cancel).toEqualTypeOf<() => void>()
    expectTypeOf(press.stop).toEqualTypeOf<() => void>()
  })
})

// Checked by `tsc`, not at run time.

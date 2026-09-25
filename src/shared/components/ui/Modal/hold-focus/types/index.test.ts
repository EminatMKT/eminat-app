import { describe, expectTypeOf, it } from 'vitest'
import type { Entry } from './index'

describe('hold-focus types', () => {
  // The real entry is made of DOM nodes; the tests hand in plain objects. Both have to fit.
  it('takes the dialog box and its opener as DOM elements', () => {
    expectTypeOf<{ box: HTMLElement; first: HTMLElement; active: Element | null; opener: HTMLElement | null }>()
      .toMatchTypeOf<Entry>()
  })
})

// Checked by `tsc`, not at run time.

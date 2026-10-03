import { describe, expectTypeOf, it } from 'vitest'
import type { KeyboardEvent } from 'react'
import type { ComboView } from './index'

type InputKeyHandler = (event: KeyboardEvent<HTMLInputElement>) => void

describe('Frame types', () => {
  // The hook's key handler is spread straight onto the input, so it must take React's key event.
  it('the key handler fits the input', () => {
    expectTypeOf<ComboView>().toHaveProperty('onKeyDown').toMatchTypeOf<InputKeyHandler>()
  })
})

// Checked by `tsc`, not at run time.

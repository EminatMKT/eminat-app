import { describe, expectTypeOf, it } from 'vitest'
import type { ComboOption, ComboSearch, ComboState, KeyOutcome } from './index'

describe('Combobox types', () => {
  it('an option is an id and the label the box filters by', () => {
    expectTypeOf<ComboOption>().toEqualTypeOf<Record<'id' | 'label', string>>()
  })

  it('a key outcome may leave the state alone and pick nothing', () => {
    expectTypeOf<{ handled: false }>().toMatchTypeOf<KeyOutcome>()
    expectTypeOf<ComboState>().toHaveProperty('active').toEqualTypeOf<number>()
  })

  it('the empty state gets the search and a way to clear it', () => {
    expectTypeOf<ComboSearch>().toHaveProperty('clear').toEqualTypeOf<() => void>()
  })
})

// Checked by `tsc`, not at run time.

import { expect, it } from 'vitest'
import type { SaveErrors, SaveField } from './index'

// Fixtures, not shipped copy.
const FIELD: SaveField = { name: 'amount', label: 'Amount', blank: false }
const WRONG = 'fixture.amount.error'

// A form's own error map —keyed by its own field names— is handed over as it is, with no copy.
it('takes a form\'s own error map, whatever its field names', () => {
  const own: Partial<Record<'amount' | 'title', string>> = { amount: WRONG }
  const errors: SaveErrors = own
  expect(errors[FIELD.name]).toBe(WRONG)
})

it('refuses at compile time a field described without saying whether it is blank', () => {
  // @ts-expect-error a field has to say whether its box is empty
  const partial: SaveField = { name: 'title', label: 'Title' }
  expect(partial.name).toBe('title')
})

import { it, expect } from 'vitest'
import values from '@/features/billing-v2/domain/record-values'
import LABEL_VARS from './index'

// The amount's label shows the currency it is stored in, taken from the domain and never typed.
it('names the currency every amount is stored in', () => {
  expect(values.currency.options).toContain(LABEL_VARS.currency)
})

import { expect, it } from 'vitest'
import values from './index'

const OUTSIDE = 'not_a_member'

it('publishes the three closed lists in their approved order', () => {
  expect(values.recordType.options).toEqual(['payment', 'event', 'month_note'])
  expect(values.category.options).toEqual(['payroll', 'contractors_vendors'])
  expect(values.paymentStatus.options).toEqual([
    'pending',
    'scheduled',
    'pending_approval',
    'paid',
  ])
})

// The database CHECK admits one currency; a second one here would validate and then not store.
it('stores a single currency, the one the table accepts', () => {
  expect(values.currency.options).toEqual(['USD'])
})

it('rejects anything outside each list', () => {
  for (const list of [values.recordType, values.category, values.paymentStatus, values.currency]) {
    expect(list.safeParse(OUTSIDE).success).toBe(false)
  }
})

it('addresses every member by name so no schema repeats the literal', () => {
  expect(values.recordType.enum.month_note).toBe('month_note')
  expect(values.category.enum.contractors_vendors).toBe('contractors_vendors')
  expect(values.paymentStatus.enum.pending_approval).toBe('pending_approval')
})

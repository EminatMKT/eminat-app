import { it, expect } from 'vitest'
import type { FieldErrors } from '@/features/billing-v2/components/RecordEditor/types'
import visibleErrors from './index'

const ERRORS: FieldErrors = { title: 'billing.error.title', amount: 'billing.error.amount' }

// Validation runs on every change; a message is only shown once the person is done with its box.
it('shows nothing for a box nobody has left yet', () => {
  expect(visibleErrors(ERRORS, [], false)).toEqual({})
})

it('shows the message of a box the person left, and only of that one', () => {
  expect(visibleErrors(ERRORS, ['title'], false)).toEqual({ title: 'billing.error.title' })
})

// After a save attempt every invalid box says what is wrong with it, left or not.
it('shows every message once somebody tried to save', () => {
  expect(visibleErrors(ERRORS, [], true)).toEqual(ERRORS)
})

// A fixed box drops its message on the change that fixed it, with nothing to press.
it('drops the message of a box that is valid now, even after it was left', () => {
  expect(visibleErrors({ amount: 'billing.error.amount' }, ['title', 'amount'], false)).toEqual({ amount: 'billing.error.amount' })
})

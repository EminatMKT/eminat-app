import { expect, it } from 'vitest'
import type {
  BillingEventInput,
  BillingMonthNoteInput,
  BillingPaymentInput,
  BillingRecordInput,
} from './index'

const payment: BillingPaymentInput = {
  recordType: 'payment',
  scheduledOn: '2026-09-23',
  scheduledTime: null,
  title: 'September payroll',
  category: 'payroll',
  paymentStatus: 'pending',
  payeeLabel: 'Operations team',
  amount: null,
  noteText: null,
  closingApprovalFollowUp: false,
}

const event: BillingEventInput = {
  recordType: 'event',
  scheduledOn: '2026-09-24',
  scheduledTime: '09:30',
  title: 'Board review',
  eventTypeLabel: null,
  noteText: null,
}

const monthNote: BillingMonthNoteInput = {
  recordType: 'month_note',
  noteMonth: '2026-09-01',
  noteText: 'Closing notes for September',
}

const records: BillingRecordInput[] = [payment, event, monthNote]

it('admits exactly one shape per record type', () => {
  expect(records).toHaveLength(3)
})

it('refuses at compile time a field that belongs to another record type', () => {
  // @ts-expect-error an event carries no amount
  const eventWithAmount: BillingEventInput = { ...event, amount: '10.00' }
  // @ts-expect-error a month note carries no scheduled day
  const noteWithDay: BillingMonthNoteInput = { ...monthNote, scheduledOn: '2026-09-23' }
  expect([eventWithAmount, noteWithDay]).toHaveLength(2)
})

it('refuses at compile time a payment that is missing its payee', () => {
  const { payeeLabel, ...rest } = payment
  // @ts-expect-error a payment always names who is being paid
  const withoutPayee: BillingPaymentInput = rest
  expect(payeeLabel).toBe(payment.payeeLabel)
  expect(withoutPayee.title).toBe(payment.title)
})

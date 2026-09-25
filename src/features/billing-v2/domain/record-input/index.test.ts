import { expect, it } from 'vitest'
import type { BillingEventInput, BillingMonthNoteInput, BillingPaymentInput } from '../types'
import billingRecordInput from './index'

const PAYMENT: BillingPaymentInput = {
  recordType: 'payment',
  scheduledOn: '2026-10-05',
  scheduledTime: '14:00',
  title: 'Vendor invoice 118',
  category: 'contractors_vendors',
  paymentStatus: 'scheduled',
  payeeLabel: 'Andina Supplies',
  amount: '1.2300',
  noteText: '  ',
  closingApprovalFollowUp: true,
}
const EVENT: BillingEventInput = {
  recordType: 'event',
  scheduledOn: '2026-10-06',
  scheduledTime: null,
  title: 'Quarter close',
  eventTypeLabel: null,
  noteText: null,
}
const NOTE: BillingMonthNoteInput = {
  recordType: 'month_note',
  noteMonth: '2026-10-01',
  noteText: 'October plan',
}

const parse = (record: unknown) => billingRecordInput.safeParse(record)
const parsed = (record: unknown): Record<string, unknown> => parse(record).data
const drop = (record: Record<string, unknown>, key: string): Record<string, unknown> => {
  const copy = { ...record }
  delete copy[key]
  return copy
}

it('accepts every shape the contract admits and normalizes a blank note to null', () => {
  expect(parse(PAYMENT).success).toBe(true)
  expect(parse(EVENT).success).toBe(true)
  expect(parse(NOTE).success).toBe(true)
  expect(parsed(PAYMENT)).toMatchObject({ amount: '1.2300', noteText: null })
})

it('keeps an unknown amount apart from an explicit zero', () => {
  expect(parsed({ ...PAYMENT, amount: null }).amount).toBeNull()
  expect(parsed({ ...PAYMENT, amount: '0' }).amount).toBe('0')
})

it('refuses an event that carries a payment field', () => {
  for (const extra of [{ amount: '5.00' }, { category: 'payroll' }, { payeeLabel: 'Ana' }]) {
    expect(parse({ ...EVENT, ...extra }).success).toBe(false)
  }
})

it('refuses a payment that is missing a required field', () => {
  for (const key of ['payeeLabel', 'category', 'paymentStatus', 'scheduledOn', 'title', 'amount']) {
    expect(parse(drop(PAYMENT, key)).success).toBe(false)
  }
})

it('refuses a month note that carries a day, a time or a blank text', () => {
  expect(parse({ ...NOTE, scheduledOn: '2026-10-05' }).success).toBe(false)
  expect(parse({ ...NOTE, scheduledTime: '09:00' }).success).toBe(false)
  expect(parse({ ...NOTE, noteText: ' ' }).success).toBe(false)
  expect(parse({ ...NOTE, noteMonth: '2026-10-02' }).success).toBe(false)
})

it('refuses illegal record types, categories, statuses, times and amounts', () => {
  expect(parse({ ...PAYMENT, recordType: 'invoice' }).success).toBe(false)
  expect(parse({ ...PAYMENT, category: 'rent' }).success).toBe(false)
  expect(parse({ ...PAYMENT, paymentStatus: 'approved' }).success).toBe(false)
  expect(parse({ ...PAYMENT, scheduledTime: '24:00' }).success).toBe(false)
  expect(parse({ ...PAYMENT, amount: '1.005' }).success).toBe(false)
})

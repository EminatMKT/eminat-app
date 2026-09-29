import { isSameMonth, parseISO } from 'date-fns'
import type { BillingV2Record } from '@/shared/data'
import isPayment from '../is-payment'

type MonthOverview = {
  subtotalCents: number
  unknownCount: number
  byCategory: Record<'payroll' | 'contractors_vendors', number>
  byStatus: Record<'pending' | 'scheduled' | 'pending_approval' | 'paid', number>
}

const inMonth = (period: string) => ({ scheduled_on }: BillingV2Record) =>
  scheduled_on !== null && isSameMonth(parseISO(scheduled_on), parseISO(period))

// A decimal string's cents as an integer, read once — never a running float total (see
// `money-text`'s own comment: `Number` is safe for drawing ONE amount, not for adding many).
function toCents(amount: string): number {
  const [whole, decimals = ''] = amount.split('.')
  const cents = `${decimals}00`.slice(0, 2)
  return Number(whole) * 100 + Number(cents)
}

/** The calendar month `period` falls in, tallied from every payment scheduled inside it. Events
 *  and month notes never reach these numbers; only payments do. */
export default function monthOverview(records: readonly BillingV2Record[], period: string): MonthOverview {
  const payments = records.filter(isPayment).filter(inMonth(period))
  const byCategory: Record<'payroll' | 'contractors_vendors', number> = { payroll: 0, contractors_vendors: 0 }
  const byStatus: Record<'pending' | 'scheduled' | 'pending_approval' | 'paid', number> = {
    pending: 0, scheduled: 0, pending_approval: 0, paid: 0,
  }
  let subtotalCents = 0
  let unknownCount = 0
  for (const payment of payments) {
    if (payment.category) byCategory[payment.category] += 1
    if (payment.payment_status) byStatus[payment.payment_status] += 1
    if (payment.amount === null) unknownCount += 1
    else subtotalCents += toCents(payment.amount)
  }
  const result: MonthOverview = { subtotalCents, unknownCount, byCategory, byStatus }
  return result
}

// Both tallies start zeroed at every catalog member so a category or status with no payments
// this month still shows a zero slice, instead of silently missing from a chart later.

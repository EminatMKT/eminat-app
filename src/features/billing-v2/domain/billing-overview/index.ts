import type { BillingV2Record } from '@/shared/data'
import isPayment from '../is-payment'

type BillingOverview = {
  subtotalCents: number
  unknownCount: number
  byCategory: Record<'payroll' | 'contractors_vendors', number>
  byStatus: Record<'pending' | 'scheduled' | 'pending_approval' | 'paid', number>
}

// A decimal string's cents as an integer, read once — never a running float total (see
// `money-text`'s own comment: `Number` is safe for drawing ONE amount, not for adding many).
function toCents(amount: string): number {
  const [whole, decimals = ''] = amount.split('.')
  const cents = `${decimals}00`.slice(0, 2)
  return Number(whole) * 100 + Number(cents)
}

/** Tallies whichever payments it's handed — the caller has already narrowed them down, through
 *  the module's own filter engine, to whatever date range or category it wants summarized.
 *  Events and month notes never reach these numbers; only payments do. */
export default function billingOverview(records: readonly BillingV2Record[]): BillingOverview {
  const payments = records.filter(isPayment)
  const byCategory: Record<'payroll' | 'contractors_vendors', number> = { payroll: 0, contractors_vendors: 0 }
  const byStatus: Record<'pending' | 'scheduled' | 'pending_approval' | 'paid', number> = {
    pending: 0,
    scheduled: 0,
    pending_approval: 0,
    paid: 0,
  }
  let subtotalCents = 0
  let unknownCount = 0
  for (const payment of payments) {
    if (payment.category) byCategory[payment.category] += 1
    if (payment.payment_status) byStatus[payment.payment_status] += 1
    if (payment.amount === null) unknownCount += 1
    else subtotalCents += toCents(payment.amount)
  }
  const result: BillingOverview = {
    subtotalCents,
    unknownCount,
    byCategory,
    byStatus,
  }
  return result
}

// Both tallies start zeroed at every catalog member so a category or status with no payments
// in the current filter still shows a zero slice, instead of silently missing from a chart.
//
// No date filtering happens here on purpose — it used to, bound to a single calendar month, which
// is exactly the ceiling the Overview tab outgrew: `BillingOverviewTab` now narrows `records`
// itself, through `useBillingFilters`' date-range filter (any range, not just "this month") plus
// category and status, before this function ever sees them.

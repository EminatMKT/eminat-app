import type { BillingV2Record } from '@/shared/data'
import isPayment from '../is-payment'
import billingRecordValues from '../record-values'
import toCents from '../to-cents'

type BillingOverview = {
  totalCents: number
  paidCents: number
  pendingCents: number
  unknownCount: number
}

const { paid: PAID, pending: PENDING } = billingRecordValues.paymentStatus.enum

/** The Overview tab's three headline totals, tallied from whichever payments it's handed. */
export default function billingOverview(records: readonly BillingV2Record[]): BillingOverview {
  const payments = records.filter(isPayment)
  let totalCents = 0
  let paidCents = 0
  let pendingCents = 0
  let unknownCount = 0
  for (const payment of payments) {
    if (payment.amount === null) { unknownCount += 1; continue }
    const cents = toCents(payment.amount)
    totalCents += cents
    if (payment.payment_status === PAID) paidCents += cents
    if (payment.payment_status === PENDING) pendingCents += cents
  }
  const result: BillingOverview = {
    totalCents,
    paidCents,
    pendingCents,
    unknownCount,
  }
  return result
}

// An unknown amount can't contribute a dollar figure to any total — it only counts toward
// `unknownCount`. No date filtering here on purpose: the tab narrows `records` itself first.

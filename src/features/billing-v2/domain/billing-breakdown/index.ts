import type { BillingV2Record } from '@/shared/data'
import isPayment from '../is-payment'
import billingRecordValues from '../record-values'
import toCents from '../to-cents'

type BillingBreakdown = {
  byStatusCents: Record<'pending' | 'scheduled' | 'pending_approval' | 'paid', number>
  paidByCategoryCents: Record<'payroll' | 'contractors_vendors', number>
  pendingByCategoryCents: Record<'payroll' | 'contractors_vendors', number>
}

const { paid: PAID, pending: PENDING } = billingRecordValues.paymentStatus.enum

/** How the tab's donuts break down whichever payments it's handed: by status, and by category
 *  within paid and within pending, each amount-weighted. */
export default function billingBreakdown(records: readonly BillingV2Record[]): BillingBreakdown {
  const payments = records.filter(isPayment)
  const byStatusCents = {
    pending: 0,
    scheduled: 0,
    pending_approval: 0,
    paid: 0,
  }
  const paidByCategoryCents = { payroll: 0, contractors_vendors: 0 }
  const pendingByCategoryCents = { payroll: 0, contractors_vendors: 0 }
  for (const payment of payments) {
    if (payment.amount === null) continue
    const cents = toCents(payment.amount)
    if (payment.payment_status) byStatusCents[payment.payment_status] += cents
    if (payment.payment_status === PAID && payment.category) paidByCategoryCents[payment.category] += cents
    if (payment.payment_status === PENDING && payment.category) pendingByCategoryCents[payment.category] += cents
  }
  const result: BillingBreakdown = {
    byStatusCents,
    paidByCategoryCents,
    pendingByCategoryCents,
  }
  return result
}

// Amount-weighted so a status or category with nothing still shows a zero slice. An unknown
// amount is skipped entirely — it can't contribute a dollar figure to any breakdown.

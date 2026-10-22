import 'server-only'
import { createHash } from 'node:crypto'
import type { QboInvoice, QboPayment } from './client'

export type ReconciliationDecision =
  | { status: 'PAID'; reference: string; paymentIds: string[]; paidAt: string }
  | { status: 'PENDING' | 'RETRY' | 'REVIEW'; reason: string }

export function invoiceIdsForPayment(payment: QboPayment): string[] {
  return Array.from(new Set((payment.Line ?? []).flatMap(line =>
    (line.LinkedTxn ?? []).filter(link => link.TxnType === 'Invoice')
      .map(link => link.TxnId))))
}

export function patientInvoiceMappingValid(input: {
  organizationId: string
  mapping: { organization_id: string; enrollment_intent_id: string;
    opportunity_id: string; base_invoice_amount_cents: number }
  intent: { organization_id: string; id: string; opportunity_id: string;
    patient_identity_id: string; amount_cents: number }
  opportunity: { organization_id: string; id: string; primary_contact_id: string | null;
    amount: number; currency: string }
  identity: { organization_id: string; id: string; contact_id: string | null }
}): boolean {
  const { organizationId, mapping, intent, opportunity, identity } = input
  return [mapping, intent, opportunity, identity].every(row => row.organization_id === organizationId) &&
    mapping.enrollment_intent_id === intent.id && mapping.opportunity_id === intent.opportunity_id &&
    opportunity.id === intent.opportunity_id && identity.id === intent.patient_identity_id &&
    !!identity.contact_id && identity.contact_id === opportunity.primary_contact_id &&
    mapping.base_invoice_amount_cents === intent.amount_cents &&
    opportunity.currency === 'USD' && cents(Number(opportunity.amount)) === intent.amount_cents
}

function cents(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null
  const rounded = Math.round(value * 100)
  return Math.abs(value * 100 - rounded) < 0.00001 ? rounded : null
}

/** Webhooks are hints. Only current, provider-read invoice and payment objects count. */
export function decideQboPayment(input: {
  invoice: QboInvoice; payments: QboPayment[]; invoiceId: string;
  invoiceNumber: string; customerId: string; amountCents: number;
  alreadyActive: boolean
}): ReconciliationDecision {
  const { invoice, payments } = input
  if (invoice.Id !== input.invoiceId || invoice.DocNumber !== input.invoiceNumber ||
    invoice.CustomerRef.value !== input.customerId ||
    invoice.CurrencyRef?.value !== undefined && invoice.CurrencyRef.value !== 'USD' ||
    cents(invoice.TotalAmt) !== input.amountCents)
    return { status: 'REVIEW', reason: 'INVOICE_MAPPING_MISMATCH' }
  const balance = cents(invoice.Balance)
  if (balance === null || balance > input.amountCents)
    return { status: 'REVIEW', reason: 'INVOICE_BALANCE_INVALID' }
  if (balance > 0) return input.alreadyActive
    ? { status: 'REVIEW', reason: 'ACTIVE_INVOICE_REVERSED_OR_PARTIAL' }
    : { status: 'PENDING', reason: 'INVOICE_UNPAID_OR_PARTIAL' }
  const linkedIds = Array.from(new Set((invoice.LinkedTxn ?? [])
    .filter(link => link.TxnType === 'Payment').map(link => link.TxnId))).sort()
  if (!linkedIds.length || linkedIds.length !== payments.length ||
    payments.some(payment => !linkedIds.includes(payment.Id)))
    return { status: 'RETRY', reason: 'PAYMENT_LINKS_NOT_READY' }
  let applied = 0
  for (const payment of payments) {
    if (payment.CustomerRef.value !== input.customerId || cents(payment.TotalAmt) === null)
      return { status: 'REVIEW', reason: 'PAYMENT_CUSTOMER_MISMATCH' }
    for (const line of payment.Line ?? []) {
      if ((line.LinkedTxn ?? []).some(link => link.TxnType === 'Invoice' &&
        link.TxnId === input.invoiceId)) {
        const amount = cents(line.Amount)
        if (amount === null) return { status: 'REVIEW', reason: 'PAYMENT_AMOUNT_INVALID' }
        applied += amount
      }
    }
  }
  if (applied < input.amountCents)
    return { status: 'RETRY', reason: 'PAYMENT_APPLICATION_NOT_READY' }
  if (applied > input.amountCents)
    return { status: 'REVIEW', reason: 'PAYMENT_OVERAPPLIED' }
  if (input.alreadyActive) return { status: 'REVIEW', reason: 'ALREADY_ACTIVE' }
  const latest = payments.map(payment => payment.TxnDate ?? '').sort().at(-1)
  const paidAt = latest && /^\d{4}-\d{2}-\d{2}$/.test(latest)
    ? `${latest}T12:00:00.000Z` : new Date().toISOString()
  const reference = `QBO-${input.invoiceId}-${createHash('sha256')
    .update(linkedIds.join(',')).digest('hex').slice(0,32)}`
  return { status: 'PAID', reference, paymentIds: linkedIds, paidAt }
}

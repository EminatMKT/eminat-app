import type { I18nKey } from '@/shared/i18n'
import billingRecordInput from '@/features/billing-v2/domain/record-input'
import type { BillingRecordInput } from '@/features/billing-v2/domain/types'
import formPayload from '../form-payload'
import type { FormResult, RecordForm } from '../types'

const ERRORS: Record<string, I18nKey> = {
  scheduledOn: 'billing.error.scheduledOn', scheduledTime: 'billing.error.scheduledTime',
  title: 'billing.error.title', category: 'billing.error.category',
  paymentStatus: 'billing.error.paymentStatus', payeeLabel: 'billing.error.payeeLabel',
  amount: 'billing.error.amount', eventTypeLabel: 'billing.error.eventTypeLabel',
  noteText: 'billing.error.noteText', noteMonth: 'billing.error.noteMonth',
}

/** Validates the form and hands back the mutation, or the fields that have to be fixed first. */
export default function formInput(form: RecordForm): FormResult {
  const parsed = billingRecordInput.safeParse(formPayload(form))
  if (parsed.success) return { input: parsed.data as BillingRecordInput, errors: [] }
  const named = parsed.error.issues.map((issue) => ERRORS[String(issue.path[0])]).filter(Boolean)
  const result = { input: null, errors: Array.from(new Set(named)) }
  return result
}

// The gate between what somebody typed and what the repository sends. It runs the domain schema
// the database mirrors, so an invalid record is refused here instead of travelling the network to
// be refused by a CHECK — and the person is told which box is wrong rather than that something
// failed. A rejected form produces no mutation at all: `input` is null, and the caller keeps
// every value on screen, because losing what was typed is the failure this guards against.

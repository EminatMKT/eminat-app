import type { z } from 'zod'
import billingRecordInput from '@/features/billing-v2/domain/record-input'
import type { BillingRecordInput } from '@/features/billing-v2/domain/types'
import formPayload from '../form-payload'
import type { FieldErrors, FormResult, RecordForm } from '../types'
import ERROR_KEYS from './error-keys'

type Issue = z.ZodError['issues'][number]

const isFormField = (name: string): name is keyof RecordForm => name in ERROR_KEYS.byField

/** The schema's output checked against the hand-written contract, instead of cast into it. */
const isRecordInput = (value: unknown): value is BillingRecordInput => billingRecordInput.safeParse(value).success

/** The first issue of each field, as the message that goes under that field's box. */
function fieldErrors(issues: readonly Issue[]): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of issues) {
    const name = String(issue.path[0])
    if (!isFormField(name) || errors[name]) continue
    errors[name] = issue.code === ERROR_KEYS.tooBigCode ? ERROR_KEYS.tooLong : ERROR_KEYS.byField[name]
  }
  return errors
}

/** Validates the form and hands back the mutation, or the fields that have to be fixed first. */
export default function formInput(form: RecordForm): FormResult {
  const parsed = billingRecordInput.safeParse(formPayload(form))
  if (!parsed.success) return { input: null, errors: fieldErrors(parsed.error.issues) }
  const output: unknown = parsed.data
  const result = { input: isRecordInput(output) ? output : null, errors: {} }
  return result
}

// The gate between what somebody typed and what the repository sends. It runs the domain schema
// the database mirrors, so an invalid record is refused here instead of travelling the network to
// be refused by a CHECK — and each refusal is keyed by its field, so the message is drawn under
// the box that caused it and not in a list the person has to map back to the form. A rejected
// form produces no mutation at all: `input` is null, and the caller keeps every value on screen,
// because losing what was typed is the failure this guards against. With `strict` off, zod infers
// the nullable keys as optional ones, so its output is narrowed to the contract by a guard that
// runs the schema again — a check, where the old code had a cast.

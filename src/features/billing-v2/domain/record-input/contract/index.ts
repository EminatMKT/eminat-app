import type { BillingRecordInput } from '@/features/billing-v2/domain/types'
import billingRecordInput from '../index'

/** Whether a value is a billing mutation, checked by running the schema instead of cast. */
export default function isRecordInput(value: unknown): value is BillingRecordInput {
  return billingRecordInput.safeParse(value).success
}

// With `strict` off in tsconfig, zod infers the nullable keys as optional ones, so a parsed value
// no longer matches the DTO it validated. This guard narrows it back, in the one place both the
// editor and the data layer read it from.

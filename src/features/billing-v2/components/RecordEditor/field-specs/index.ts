import values from '@/features/billing-v2/domain/record-values'
import CONTROL from '../control-kinds'
import type { BillingRecordType, FieldSpec } from '../types'

const SPECS: Record<BillingRecordType, FieldSpec[]> = {
  payment: [
    { name: 'scheduledOn', control: CONTROL.date, labelKey: 'billing.field.scheduledOn', hintKey: 'billing.help.scheduledOn', required: true },
    { name: 'scheduledTime', control: CONTROL.time, labelKey: 'billing.field.scheduledTime' },
    { name: 'title', control: CONTROL.text, labelKey: 'billing.field.title', required: true },
    { name: 'category', control: CONTROL.select, labelKey: 'billing.field.category', options: values.category.options, required: true },
    { name: 'paymentStatus', control: CONTROL.select, labelKey: 'billing.field.paymentStatus', options: values.paymentStatus.options, required: true },
    { name: 'payeeLabel', control: CONTROL.text, labelKey: 'billing.field.payeeLabel', required: true },
    { name: 'amount', control: CONTROL.text, labelKey: 'billing.field.amount', hintKey: 'billing.help.amount', liveAmount: true },
    { name: 'closingApprovalFollowUp', control: CONTROL.toggle, labelKey: 'billing.field.followUp', hintKey: 'billing.help.followUp' },
    { name: 'noteText', control: CONTROL.textarea, labelKey: 'billing.field.noteText' },
  ],
  event: [
    { name: 'scheduledOn', control: CONTROL.date, labelKey: 'billing.field.scheduledOn', required: true },
    { name: 'scheduledTime', control: CONTROL.time, labelKey: 'billing.field.scheduledTime' },
    { name: 'title', control: CONTROL.text, labelKey: 'billing.field.title', required: true },
    { name: 'eventTypeLabel', control: CONTROL.text, labelKey: 'billing.field.eventTypeLabel' },
    { name: 'noteText', control: CONTROL.textarea, labelKey: 'billing.field.noteText' },
  ],
  month_note: [
    { name: 'noteMonth', control: CONTROL.date, labelKey: 'billing.field.noteMonth', hintKey: 'billing.help.noteMonth', required: true },
    { name: 'noteText', control: CONTROL.textarea, labelKey: 'billing.field.noteText', required: true },
  ],
}

/** The fields a record of this type is edited with, in the order they are drawn. */
export default function fieldSpecs(kind: BillingRecordType): FieldSpec[] {
  return SPECS[kind]
}

// The form as data instead of as markup: the record type picks a list and one renderer draws
// whatever is in it, so the three subtypes cannot drift into three hand-written forms. Each
// closed list of options points at the domain enum rather than repeating its members, and every
// visible word is an i18n key — what is stored stays the canonical value underneath.

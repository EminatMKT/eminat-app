import values from '@/features/billing-v2/domain/record-values'
import TEXT_MAX from '@/features/billing-v2/domain/text-limits'
import CONTROL from '../control-kinds'
import type { BillingRecordType, FieldSpec } from '../types'

const TITLE: FieldSpec = { name: 'title', control: CONTROL.text, labelKey: 'billing.field.title', required: true, maxLength: TEXT_MAX.title }
const NOTE: FieldSpec = { name: 'noteText', control: CONTROL.textarea, labelKey: 'billing.field.noteText', maxLength: TEXT_MAX.noteText }

const SPECS: Record<BillingRecordType, FieldSpec[]> = {
  payment: [
    { name: 'scheduledOn', control: CONTROL.date, labelKey: 'billing.field.scheduledOn', hintKey: 'billing.help.scheduledOn', required: true },
    { name: 'scheduledTime', control: CONTROL.time, labelKey: 'billing.field.scheduledTime' },
    TITLE,
    { name: 'category', control: CONTROL.select, labelKey: 'billing.field.category', options: values.category.options, required: true },
    { name: 'paymentStatus', control: CONTROL.select, labelKey: 'billing.field.paymentStatus', options: values.paymentStatus.options, required: true },
    { name: 'payeeLabel', control: CONTROL.text, labelKey: 'billing.field.payeeLabel', required: true, maxLength: TEXT_MAX.payeeLabel },
    { name: 'amount', control: CONTROL.text, labelKey: 'billing.field.amount', hintKey: 'billing.help.amount', liveAmount: true, inputMode: 'decimal' },
    { name: 'closingApprovalFollowUp', control: CONTROL.toggle, labelKey: 'billing.field.followUp', hintKey: 'billing.help.followUp' },
    NOTE,
  ],
  event: [
    { name: 'scheduledOn', control: CONTROL.date, labelKey: 'billing.field.date', required: true },
    { name: 'scheduledTime', control: CONTROL.time, labelKey: 'billing.field.scheduledTime' },
    TITLE,
    { name: 'eventTypeLabel', control: CONTROL.text, labelKey: 'billing.field.eventTypeLabel', maxLength: TEXT_MAX.eventTypeLabel },
    NOTE,
  ],
  month_note: [
    { name: 'noteMonth', control: CONTROL.date, labelKey: 'billing.field.date', hintKey: 'billing.help.noteMonth', required: true },
    { ...NOTE, required: true },
  ],
}

/** The fields a record of this type is edited with, in the order they are drawn. */
export default function fieldSpecs(kind: BillingRecordType): FieldSpec[] {
  return SPECS[kind]
}

// The form as data instead of as markup: the record type picks a list and one renderer draws
// whatever is in it, so the three subtypes cannot drift into three hand-written forms. Each
// closed list of options points at the domain enum rather than repeating its members, and every
// visible word is an i18n key — what is stored stays the canonical value underneath. A text box
// carries the limit of its column from `text-limits`, the same number the schema and the CHECK read.

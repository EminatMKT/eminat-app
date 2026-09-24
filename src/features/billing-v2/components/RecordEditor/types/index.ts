import type { z } from 'zod'
import type { I18nKey } from '@/shared/i18n'
import type values from '@/features/billing-v2/domain/record-values'
import type { BillingRecordInput } from '@/features/billing-v2/domain/types'
import type CONTROL from '../control-kinds'

/** One of the three kinds of row billing v2 stores, taken from the domain enum. */
export type BillingRecordType = z.infer<typeof values.recordType>

/** Which control a field is edited with. */
export type ControlKind = (typeof CONTROL)[keyof typeof CONTROL]

/** Every box of the editor. Each is text while it is being typed, so nothing about a record
 *  is coerced before the domain schema has judged it. */
export type RecordForm = {
  recordType: BillingRecordType
  scheduledOn: string; scheduledTime: string; title: string
  category: string; paymentStatus: string; payeeLabel: string; amount: string
  eventTypeLabel: string; noteText: string; noteMonth: string
  closingApprovalFollowUp: boolean
}

/** One field of the form, as data: which box it is, what it is called and what helps read it. */
export type FieldSpec = {
  name: keyof RecordForm
  control: ControlKind
  labelKey: I18nKey
  hintKey?: I18nKey
  required?: boolean
  options?: readonly string[]
  liveAmount?: boolean
}

/** How a control reports a change: which box, and what it holds now. */
export type EditField = (name: keyof RecordForm, value: string | boolean) => void

/** What every piece that draws one field is handed: its spec, the whole form, and the way back. */
export type FieldProps = { spec: FieldSpec; form: RecordForm; onEdit: EditField }

/** The write the editor hands its record to: null creates, an id updates. Answers whether it
 *  landed, because a failed save has to keep every value on screen. */
export type SaveRecord = (id: string | null, input: BillingRecordInput) => Promise<boolean>

/** The deletion the editor asks for by id. Answers whether it landed: a failed one keeps the row. */
export type DropRecord = (id: string) => Promise<boolean>

/** What validating the form gives back: the mutation, or the fields that are wrong. */
export type FormResult = { input: BillingRecordInput | null; errors: I18nKey[] }

// The shapes the editor works in, none of which is the shape that gets stored. `RecordForm`
// carries every column of all three subtypes at once so that switching a new record from a
// payment to an event does not throw away the concept already written; the payload builder then
// sends only the columns the chosen subtype owns. `FieldSpec` is what makes the form data rather
// than markup: the record type picks a list of these and one renderer draws whatever is in it.

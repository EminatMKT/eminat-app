import type { BillingV2Record } from '@/shared/data'

function normalized(value: string | null): string {
  if (value == null) return ''
  return value.toLocaleLowerCase()
}

/** Free search over the text fields that identify any record type. */
export default function matchesText(
  {
    title,
    payee_label,
    note_text,
    event_type_label,
  }: BillingV2Record,
  value: string,
): boolean {
  const needle = value.trim().toLocaleLowerCase()
  const fields = [title, payee_label, note_text, event_type_label]
  return fields.some(field => normalized(field).includes(needle))
}

// `event_type_label` is included because events often use it as their clearest label.

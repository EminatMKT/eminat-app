'use client'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import recordFields from '@/features/billing-v2/components/record-fields'
import RecordButton from '@/features/billing-v2/components/RecordButton'
import CardField from '@/features/billing-v2/components/CardField'

type Props = {
  record: BillingV2Record
  onOpen: (record: BillingV2Record) => void
}

export default function ReminderItem({ record, onOpen }: Props) {
  const { t, intlLocale } = useT()
  const fields = recordFields(record, t, intlLocale)
  const due = fields.time ? `${fields.date} ${fields.time}` : fields.date
  return (
    <RecordButton accessibleLabel={t('billing.reminders.cardAria', { ...fields, date: due })} look="card"
      onPress={() => onOpen(record)}>
      <CardField slot="date">{due}</CardField>
      <CardField slot="status">{fields.status}</CardField>
      <CardField slot="concept">{fields.concept}</CardField>
      <CardField slot="payee">{fields.payee}</CardField>
      <CardField slot="amount">{fields.amount}</CardField>
      {fields.marker && <CardField slot="marker">{fields.marker}</CardField>}
    </RecordButton>
  )
}

// One unpaid payment in a reminder group, as a card that opens it in the editor — the same editor
// the calendar opens, so marking it paid or moving its date from here is one step.
//
// Each field takes its own slot of the card, and every card has the same slots: the due date
// and the status on top, the concept across, who is paid and the amount below. The fields come
// from `recordFields`, the same the calendar chip is named from, so the two never disagree about
// a payment. An unknown amount comes through as "unknown", never as a zero.

'use client'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { fechaCorta } from '@/shared/utils'
import recordLine from '@/features/billing-v2/components/record-line'
import joinLine from '@/features/billing-v2/components/join-line'
import RecordButton from '@/features/billing-v2/components/RecordButton'

type Props = {
  record: BillingV2Record
  onOpen: (record: BillingV2Record) => void
}

export default function ReminderItem({ record, onOpen }: Props) {
  const { t, intlLocale } = useT()
  const due = fechaCorta(record.scheduled_on ?? '', intlLocale)
  return <RecordButton said={joinLine([due, recordLine(record, t, intlLocale)])} look="item" onPress={() => onOpen(record)} />
}

// One unpaid payment in a reminder group, as a surface that opens it in the editor — the same
// editor the calendar opens, so marking it paid or moving its date from here is one step.
//
// The line leads with the due date because that is what a reminder is sorted and grouped by, and
// the rest is the same `recordLine` the calendar chip says, so the two never disagree about a
// payment. An unknown amount comes through that line as "unknown", never as a zero.

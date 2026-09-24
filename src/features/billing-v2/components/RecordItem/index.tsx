'use client'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { Pressable } from '@/shared/components/ui'
import billingLabelKey from '@/features/billing-v2/components/RecordEditor/labels'

type Props = {
  record: BillingV2Record
  onOpen: (record: BillingV2Record) => void
}

export default function RecordItem({ record, onOpen }: Props) {
  const { t } = useT()
  const { record_type, title, scheduled_on, note_month } = record
  const name = title ?? t(billingLabelKey(record_type))
  const when = scheduled_on ?? note_month ?? t('billing.noDate')

  return (
    <Pressable accessibleLabel={t('billing.recordAria', { titulo: name, fecha: when })} onClick={() => onOpen(record)}>
      {name} · {when}
    </Pressable>
  )
}

// One stored record as a surface that opens it in the editor. It stands in until the calendar of
// the next task places records on their days; that view reuses this same open callback.

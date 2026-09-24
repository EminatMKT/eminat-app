'use client'
import { useT } from '@/shared/i18n'
import { PillToggle } from '@/shared/components/ui'
import values from '@/features/billing-v2/domain/record-values'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import billingLabelKey from '../labels'
import type { BillingRecordType } from '../types'

type Props = {
  current: BillingRecordType
  /** The record already exists, and its type is fixed at insert. */
  locked: boolean
  onPick: (kind: BillingRecordType) => void
}

export default function TypePicker({ current, locked, onPick }: Props) {
  const { t } = useT()
  if (locked) return <BillingBox part="hint">{t(billingLabelKey(current))} · {t('billing.typeLocked')}</BillingBox>

  return (
    <BillingBox part="form">
      <BillingBox part="hint">{t('billing.typeLabel')}</BillingBox>
      <BillingBox part="pills">
        {values.recordType.options.map((kind) => (
          <PillToggle key={kind} label={t(billingLabelKey(kind))} active={kind === current} onClick={() => onPick(kind)} />
        ))}
      </BillingBox>
    </BillingBox>
  )
}

// Which of the three kinds a new record is. Once stored it cannot change — the database refuses
// it, because a payment turned into an event would silently drop its amount and status — so an
// existing record shows its kind and the reason instead of a choice that would only fail.

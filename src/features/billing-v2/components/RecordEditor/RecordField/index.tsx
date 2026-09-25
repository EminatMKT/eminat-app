'use client'
import { useT } from '@/shared/i18n'
import { Field } from '@/shared/components/ui'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import amountHint from '../amount-hint'
import FieldControl from '../FieldControl'
import type { FieldProps } from '../types'

export default function RecordField({ spec, form, onEdit }: FieldProps) {
  const { t } = useT()
  const { labelKey, hintKey, required, liveAmount } = spec
  const amount = t(amountHint(form.amount), { monto: form.amount.trim() })

  return (
    <BillingBox part="form">
      <Field label={t(labelKey)} required={required}>
        <FieldControl spec={spec} form={form} onEdit={onEdit} />
      </Field>
      {hintKey && <BillingBox part="hint">{t(hintKey)}</BillingBox>}
      {liveAmount && <BillingBox part="hint">{amount}</BillingBox>}
    </BillingBox>
  )
}

// One row of the editor: the shared `Field` for the name, the control its spec asks for, and the
// lines that help read it. The help goes beside the label and not inside it, because a label may
// only hold the control it names. The amount carries a second line that changes as it is typed.

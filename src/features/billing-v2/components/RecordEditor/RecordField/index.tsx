'use client'
import { useT, type I18nKey } from '@/shared/i18n'
import { Field } from '@/shared/components/ui'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import amountHint from '../amount-hint'
import amountText from '../amount-text'
import LABEL_VARS from '../label-vars'
import FieldControl from '../FieldControl'
import type { FieldProps } from '../types'

type Props = FieldProps & {
  /** What is wrong with this field right now, once it is shown: drawn under its own box. */
  error?: I18nKey
}

export default function RecordField({ error, ...field }: Props) {
  const { t } = useT()
  const { labelKey, hintKey, required, liveAmount, maxLength = 0 } = field.spec
  const typed = amountText(field.form.amount)
  const amount = t(amountHint(typed), { monto: typed })
  const message = error && t(error, { max: maxLength })

  return (
    <BillingBox part="form">
      <Field label={t(labelKey, LABEL_VARS)} required={required} error={message}>
        <FieldControl {...field} />
      </Field>
      {hintKey && <BillingBox part="hint">{t(hintKey)}</BillingBox>}
      {liveAmount && !message && <BillingBox part="hint">{amount}</BillingBox>}
    </BillingBox>
  )
}

// One row of the editor: the shared `Field` for the name, the control its spec asks for, and the
// lines that help read it. The help goes beside the label and not inside it, because a label may
// only hold the control it names. The amount carries a second line that changes as it is typed,
// read from the same normalized text that will be sent, so «0,00» already says it is a zero.
//
// The field's error is drawn by `Field`, right under the box, which it also marks invalid and
// points at the message. A text that broke its column limit is told the limit it broke. The
// label reads the currency from the domain, so the amount says «Monto (USD)» while it is typed.

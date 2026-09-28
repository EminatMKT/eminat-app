import type { BillingV2Record } from '@/shared/data'
import type { I18nKey } from '@/shared/i18n'
import { fechaCorta, horaCorta } from '@/shared/utils'
import billingLabelKey from '@/features/billing-v2/components/RecordEditor/labels'
import moneyText from '@/features/billing-v2/components/money-text'

type Translate = (key: I18nKey) => string

/** What a dated record says, one field at a time, ready to draw: the due date and time, the
 *  concept, who is paid, how much, how far along, and the closing approval marker. An absent
 *  field comes back as an empty string. */
export default function recordFields(record: BillingV2Record, t: Translate, intlLocale: string) {
  const { scheduled_on, scheduled_time, title, payee_label } = record
  const { payment_status, closing_approval_follow_up } = record
  const fields = {
    date: fechaCorta(scheduled_on ?? '', intlLocale),
    time: scheduled_time ? horaCorta(scheduled_time, intlLocale) : '',
    concept: title ?? '',
    payee: payee_label ?? '',
    amount: moneyText(record, intlLocale) ?? t('billing.amount.missing'),
    status: payment_status ? t(billingLabelKey(payment_status)) : '',
    marker: closing_approval_follow_up ? t('billing.field.followUp') : '',
  }
  return fields
}

// The fields of a record as text, written once so the calendar chip and the reminder card never
// describe the same payment differently. They come back apart and not glued into one line: a
// card puts each in its own place, so the amounts line up down the list and the status is always
// the same badge, and a line joined with dots wrapped in a different spot on every row.
//
// An unknown amount is spelled out as unknown: a blank there looks like nothing owed. The closing
// approval marker is a visible marker only (contract §2), so it is a word and nothing else.

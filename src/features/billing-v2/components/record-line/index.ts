import type { BillingV2Record } from '@/shared/data'
import type { I18nKey } from '@/shared/i18n'
import { horaCorta } from '@/shared/utils'
import values from '@/features/billing-v2/domain/record-values'
import billingLabelKey from '@/features/billing-v2/components/RecordEditor/labels'
import moneyText from '@/features/billing-v2/components/money-text'
import joinLine from '@/features/billing-v2/components/join-line'

type Translate = (key: I18nKey) => string

/** One line that says what a dated record is: its time, concept and, for a payment, who, how
 *  much, how far along, and whether it carries the closing approval marker. */
export default function recordLine(record: BillingV2Record, t: Translate, intlLocale: string): string {
  const { record_type, scheduled_time, title, event_type_label } = record
  const { payee_label, payment_status, closing_approval_follow_up } = record
  const time = scheduled_time ? horaCorta(scheduled_time, intlLocale) : null
  if (record_type !== values.recordType.enum.payment) return joinLine([time, title, event_type_label])
  const money = moneyText(record, intlLocale) ?? t('billing.amount.missing')
  const status = payment_status ? t(billingLabelKey(payment_status)) : null
  const marker = closing_approval_follow_up ? t('billing.field.followUp') : null
  return joinLine([time, title, payee_label, money, status, marker])
}

// What the calendar chip and the reminder row both say about a record, written once so the two
// never describe the same payment differently. An unknown amount is spelled out as unknown: the
// line is the only place somebody reads the figure, and a blank there looks like nothing owed.
//
// The closing approval marker is a visible marker only (contract §2), so it is a word on the line
// and nothing else. Events carry no money and no status, so their line stops at the concept.

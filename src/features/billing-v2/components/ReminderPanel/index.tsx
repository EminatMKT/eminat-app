'use client'
import { useMemo } from 'react'
import { useT } from '@/shared/i18n'
import reminderLists from '@/features/billing-v2/domain/reminder-lists'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import ReminderGroup from '@/features/billing-v2/components/ReminderGroup'
import type { RecordViewProps } from '@/features/billing-v2/components/view-props'

export default function ReminderPanel({ records, today, onOpen }: RecordViewProps) {
  const { t } = useT()
  const { overdue, upcoming } = useMemo(() => reminderLists(records, today), [records, today])
  return (
    <BillingBox part="panel">
      <BillingBox part="hint">{t('billing.reminders.scope')}</BillingBox>
      <ReminderGroup title={t('billing.reminders.overdue')} empty={t('billing.reminders.overdueEmpty')}
        records={overdue} onOpen={onOpen} />
      <ReminderGroup title={t('billing.reminders.upcoming')} empty={t('billing.reminders.upcomingEmpty')}
        records={upcoming} onOpen={onOpen} />
    </BillingBox>
  )
}

// The in-app reminders: unpaid payments, Overdue first, then Upcoming. The lists come from every
// record and not from the month on the calendar, which the line above them says in words — a
// payment late since July must not disappear because somebody is looking at September.
//
// `today` arrives from the screen, which refreshes it when the business day turns; the lists are
// recomputed only when it or the records change.

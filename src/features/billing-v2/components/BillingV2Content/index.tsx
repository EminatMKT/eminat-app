'use client'
import { useState } from 'react'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/components/ui'
import useBillingV2Records from '@/features/billing-v2/hooks/useBillingV2Records'
import useBusinessToday from '@/features/billing-v2/hooks/useBusinessToday'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import RecordsGate from '@/features/billing-v2/components/RecordsGate'
import BillingCalendar from '@/features/billing-v2/components/BillingCalendar'
import ReminderPanel from '@/features/billing-v2/components/ReminderPanel'
import RecordEditor from '@/features/billing-v2/components/RecordEditor'

/** The record the editor is open on —null means a new one—, and the day a new one starts on. */
type OpenEditor = { record: BillingV2Record | null; day?: string }

export default function BillingV2Content() {
  const { t } = useT()
  const { records, loading, error, reload, save, remove } = useBillingV2Records()
  const today = useBusinessToday()
  const [editing, setEditing] = useState<OpenEditor | null>(null)
  const open = (record: BillingV2Record) => setEditing({ record })

  return (
    <BillingBox part="page">
      <BillingBox part="head">
        <BillingBox part="title">{t('billing.title')}</BillingBox>
        <Button kind="new" label={t('billing.new')} onClick={() => setEditing({ record: null })} />
      </BillingBox>
      <RecordsGate hasRecords={records.length > 0} loading={loading} error={error} onRetry={() => void reload()}>
        <BillingBox part="views">
          <BillingCalendar records={records} today={today} onOpen={open} onNewOn={(day) => setEditing({ record: null, day })} />
          <ReminderPanel records={records} today={today} onOpen={open} />
        </BillingBox>
      </RecordsGate>
      {editing && <RecordEditor {...editing} onSave={save} onDrop={remove} onClose={() => setEditing(null)} />}
    </BillingBox>
  )
}

// The billing screen once access is granted. It is the only place the records hook runs, so the
// calendar, the reminders and the editor all read one copy that every write refreshes: marking a
// payment paid or moving its date reloads the records, and both views redraw from the reload.
//
// The business day is read here once and handed to both views, so the calendar's opening month
// and the Overdue/Upcoming split can never disagree about what today is. What the editor opens on
// has the same shape as the editor's own props, which is why it is handed over whole.

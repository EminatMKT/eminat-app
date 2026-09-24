'use client'
import { useState } from 'react'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/components/ui'
import useBillingV2Records from '@/features/billing-v2/hooks/useBillingV2Records'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import RecordList from '@/features/billing-v2/components/RecordList'
import RecordEditor from '@/features/billing-v2/components/RecordEditor'

/** The record the editor is open on; null here means a new one. */
type OpenEditor = { record: BillingV2Record | null }

export default function BillingV2Content() {
  const { t } = useT()
  const { records, loading, error, reload, save, remove } = useBillingV2Records()
  const [editing, setEditing] = useState<OpenEditor | null>(null)

  return (
    <BillingBox part="page">
      <BillingBox part="head">
        <BillingBox part="title">{t('billing.title')}</BillingBox>
        <Button kind="new" label={t('billing.new')} onClick={() => setEditing({ record: null })} />
      </BillingBox>
      <BillingBox part="seam">
        <BillingBox part="hint">{t('billing.slotNotice')}</BillingBox>
        <RecordList records={records} loading={loading} error={error} onRetry={() => void reload()}
          onOpen={(record) => setEditing({ record })} />
      </BillingBox>
      {editing && (
        <RecordEditor record={editing.record} onSave={save} onDrop={remove} onClose={() => setEditing(null)} />
      )}
    </BillingBox>
  )
}

// The billing screen once access is granted. It is the only place the records hook runs, so the
// list, the editor and —next— the calendar and the reminders all read one copy that every write
// refreshes. The dashed seam is where the calendar and the reminder panel mount in the next task.

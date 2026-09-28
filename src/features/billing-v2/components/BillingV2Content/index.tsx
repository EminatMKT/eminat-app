'use client'
import { useState } from 'react'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { MODULE, MODULE_META } from '@/shared/auth/permissions'
import { Button, TabBar, TabButton } from '@/shared/components/ui'
import { useTabPreference } from '@/shared/hooks'
import useBillingV2Records from '@/features/billing-v2/hooks/useBillingV2Records'
import useBusinessToday from '@/features/billing-v2/hooks/useBusinessToday'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import RecordsGate from '@/features/billing-v2/components/RecordsGate'
import BillingRecordsTab from '@/features/billing-v2/components/BillingRecordsTab'
import BillingOverviewTab from '@/features/billing-v2/components/BillingOverviewTab'
import RecordEditor from '@/features/billing-v2/components/RecordEditor'
import Confirmation from '@/features/billing-v2/components/Confirmation'
import useConfirmation from '@/features/billing-v2/components/Confirmation/useConfirmation'

/** The record the editor is open on —null means a new one—, and the day a new one starts on. */
type OpenEditor = { record: BillingV2Record | null; day?: string }

export default function BillingV2Content() {
  const { t } = useT()
  const { records, loading, error, reload, save, remove } = useBillingV2Records()
  const today = useBusinessToday()
  const [editing, setEditing] = useState<OpenEditor | null>(null)
  const { said, say } = useConfirmation()
  const [tab, setTab] = useTabPreference<'records' | 'overview'>('billing', 'records', ['records', 'overview'])
  const open = (record: BillingV2Record) => setEditing({ record })

  return (
    <BillingBox part="page">
      <BillingBox part="head">
        <BillingBox part="title">{MODULE_META[MODULE.COBRANZAS].name}</BillingBox>
        <Confirmation text={said && t(said)} />
        <Button kind="new" label={t('billing.new')} onClick={() => setEditing({ record: null })} />
      </BillingBox>
      <TabBar>
        <TabButton label={t('billing.tab.records')} active={tab === 'records'} onClick={() => setTab('records')} />
        <TabButton label={t('billing.tab.overview')} active={tab === 'overview'} onClick={() => setTab('overview')} />
      </TabBar>
      <RecordsGate hasRecords={records.length > 0} loading={loading} error={error} onRetry={() => void reload()}>
        {tab === 'records'
          ? <BillingRecordsTab records={records} today={today} onOpen={open} onNewOn={(day) => setEditing({ record: null, day })} />
          : <BillingOverviewTab records={records} today={today} />}
      </RecordsGate>
      {editing && <RecordEditor {...editing} onSave={save} onDrop={remove} onLanded={say} onClose={() => setEditing(null)} />}
    </BillingBox>
  )
}

// One `records` copy feeds both tabs and the editor, so a write anywhere reloads what both show.
// `today` is resolved once here so Records and Overview never disagree about "this month".

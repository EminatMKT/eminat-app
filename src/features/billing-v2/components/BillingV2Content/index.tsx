'use client'
import { useState } from 'react'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { MODULE, MODULE_META } from '@/shared/auth/permissions'
import { Button, TabBar, TabButton } from '@/shared/components/ui'
import { useTabPreference } from '@/shared/hooks'
import useBillingV2Records from '@/features/billing-v2/hooks/useBillingV2Records'
import useBusinessToday from '@/features/billing-v2/hooks/useBusinessToday'
import useCalendarPeriod from '@/features/billing-v2/hooks/useCalendarPeriod'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import RecordsGate from '@/features/billing-v2/components/RecordsGate'
import BillingRecordsTab from '@/features/billing-v2/components/BillingRecordsTab'
import BillingOverviewTab from '@/features/billing-v2/components/BillingOverviewTab'
import RecordEditor from '@/features/billing-v2/components/RecordEditor'
import Confirmation from '@/features/billing-v2/components/Confirmation'
import useConfirmation from '@/features/billing-v2/components/Confirmation/useConfirmation'
/** The record the editor is open on —null means a new one—, and the day a new one starts on. */
type OpenEditor = { record: BillingV2Record | null; day?: string }
const RECORDS_TAB: 'records' = 'records', OVERVIEW_TAB: 'overview' = 'overview', MODULE_KEY = 'billing'
export default function BillingV2Content() {
  const { t } = useT()
  const { records, loading, error, reload, save, remove } = useBillingV2Records()
  const today = useBusinessToday()
  const [editing, setEditing] = useState<OpenEditor | null>(null)
  const { said, say } = useConfirmation()
  const [tab, setTab] = useTabPreference<'records' | 'overview'>(MODULE_KEY, RECORDS_TAB, [RECORDS_TAB, OVERVIEW_TAB])
  const [period, setPeriod] = useCalendarPeriod(today)
  const open = (record: BillingV2Record) => setEditing({ record })
  return (
    <BillingBox part="page">
      <BillingBox part="head">
        <BillingBox part="title">{MODULE_META[MODULE.COBRANZAS].name}</BillingBox>
        <Confirmation text={said && t(said)} />
        <Button kind="new" label={t('billing.new')} onClick={() => setEditing({ record: null })} />
      </BillingBox>
      <TabBar>
        <TabButton label={t('billing.tab.records')} active={tab === RECORDS_TAB} onClick={() => setTab(RECORDS_TAB)} />
        <TabButton label={t('billing.tab.overview')} active={tab === OVERVIEW_TAB} onClick={() => setTab(OVERVIEW_TAB)} />
      </TabBar>
      <RecordsGate hasRecords={records.length > 0} loading={loading} error={error} onRetry={() => void reload()}>
        {tab === RECORDS_TAB
          ? <BillingRecordsTab records={records} today={today} onOpen={open} period={period} onPeriodChange={setPeriod} onNewOn={(day) => setEditing({ record: null, day })} />
          : <BillingOverviewTab records={records} period={period} />}
      </RecordsGate>
      {editing && <RecordEditor {...editing} onSave={save} onDrop={remove} onLanded={say} onClose={() => setEditing(null)} />}
    </BillingBox>
  )
}
// `period` lives in `useCalendarPeriod` now, so it survives a tab switch instead of resetting.

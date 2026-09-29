'use client'
import { useState } from 'react'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { MODULE, MODULE_META } from '@/shared/auth/permissions'
import { Button } from '@/shared/components/ui'
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
import type { OpenEditor, Props } from './types'
const OVERVIEW_TAB = 'overview'
export default function BillingV2Content({ tab }: Props) {
  const { t } = useT()
  const { records, loading, error, reload, save, remove } = useBillingV2Records()
  const today = useBusinessToday()
  const [editing, setEditing] = useState<OpenEditor | null>(null)
  const { said, say } = useConfirmation()
  const [period, setPeriod] = useCalendarPeriod(today)
  const open = (record: BillingV2Record) => setEditing({ record })
  return (
    <BillingBox part="page">
      <BillingBox part="head">
        <BillingBox part="title">{MODULE_META[MODULE.COBRANZAS].name}</BillingBox>
        <Confirmation text={said && t(said)} />
        <Button kind="new" label={t('billing.new')} onClick={() => setEditing({ record: null })} />
      </BillingBox>
      <RecordsGate hasRecords={records.length > 0} loading={loading} error={error} onRetry={() => void reload()}>
        {tab === OVERVIEW_TAB
          ? <BillingOverviewTab records={records} period={period} />
          : <BillingRecordsTab records={records} today={today} onOpen={open} period={period} onPeriodChange={setPeriod} onNewOn={(day) => setEditing({ record: null, day })} />}
      </RecordsGate>
      {editing && <RecordEditor {...editing} onSave={save} onDrop={remove} onLanded={say} onClose={() => setEditing(null)} />}
    </BillingBox>
  )
}
// Which tab is open is decided by the sidebar now (`BillingV2Module`, via `AppShell`'s
// `activeTab`), not read here — this only draws whichever one `tab` names. `period` still lives
// in `useCalendarPeriod`, so it survives a tab switch instead of resetting.

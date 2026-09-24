'use client'
import type { BillingV2Record } from '@/shared/data'
import { useT, type I18nKey } from '@/shared/i18n'
import { Button, ErrorList, LoadingView } from '@/shared/components/ui'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import RecordItem from '@/features/billing-v2/components/RecordItem'

type Props = {
  records: BillingV2Record[]
  loading: boolean
  error: I18nKey | null
  onRetry: () => void
  onOpen: (record: BillingV2Record) => void
}

export default function RecordList(props: Props) {
  const { records, loading, error, onRetry, onOpen } = props
  const { t } = useT()

  if (loading && !records.length) return <LoadingView />
  if (error) {
    return (
      <BillingBox part="row">
        <ErrorList errores={[error]} />
        <Button kind="retry" onClick={onRetry} />
      </BillingBox>
    )
  }
  if (!records.length) return <BillingBox part="hint">{t('billing.empty')}</BillingBox>
  return <BillingBox part="records">{records.map((r) => <RecordItem key={r.id} record={r} onOpen={onOpen} />)}</BillingBox>
}

// The four states of the records, each said in its own words: still loading, failed to load,
// nothing stored yet, and the records themselves. A failed read never passes for an empty list,
// because "no payments" and "could not look" lead somebody to very different conclusions.

'use client'
import type { ReactNode } from 'react'
import type { I18nKey } from '@/shared/i18n'
import { Button, ErrorList, LoadingView } from '@/shared/components/ui'
import BillingBox from '@/features/billing-v2/components/BillingBox'

type Props = {
  hasRecords: boolean
  loading: boolean
  error: I18nKey | null
  onRetry: () => void
  /** The views that read the records, drawn once there is an answer to show. */
  children: ReactNode
}

export default function RecordsGate(props: Props) {
  const { hasRecords, loading, error, onRetry, children } = props
  if (loading && !hasRecords) return <LoadingView />
  if (error) {
    return (
      <BillingBox part="row">
        <ErrorList errores={[error]} />
        <Button kind="retry" onClick={onRetry} />
      </BillingBox>
    )
  }
  return children
}

// What stands between the records hook and the views that read it: still loading, failed to
// load, or the views. A failed read never passes for an empty calendar, because "no payments"
// and "could not look" lead somebody to very different conclusions.
//
// It replaces the plain record list that stood in for the calendar. An empty answer is not a
// state of its own any more: the calendar says every day is free and both reminder groups say
// they are empty, which is the same news told where it is read.

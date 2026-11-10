'use client'
import { ErrorList, LoadingView } from '@/shared/components/ui'
import { AVAILABILITY_VIEW_STATUS } from '../constants'
import type { LoadGateProps } from './types'

/** Holds the view back while availability loads or after the load failed; then shows it. */
export default function LoadGate({ availability, children }: LoadGateProps) {
  if (availability.status === AVAILABILITY_VIEW_STATUS.loading) return <LoadingView />

  if (availability.status === AVAILABILITY_VIEW_STATUS.error) {
    return <ErrorList errores={[availability.error]} />
  }

  return <>{children}</>
}

// Owns the availability screen's loading and load-error states, apart from the member list.

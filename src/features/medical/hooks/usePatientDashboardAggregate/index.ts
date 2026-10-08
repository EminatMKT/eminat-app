'use client'
import { useState, useEffect, useCallback } from 'react'
import patientDashboardCounts from '@/features/medical/data/patientDashboardCounts'
import type { PatientDashboardCounts } from '@/features/medical/data/patientDashboardCounts/types'

type State = {
  counts: PatientDashboardCounts | null
  loading: boolean
  error: Error | null
}

const START: State = { counts: null, loading: true, error: null }

/** Loads the Medical dashboard's count-only aggregates once on mount and exposes `reload` for a
 *  manual refresh. `counts` stays `null` until the first load resolves. */
export default function usePatientDashboardAggregate() {
  const [state, setState] = useState<State>(START)
  const { counts, loading, error } = state

  const reload = useCallback(async () => {
    setState((before) => ({ ...before, loading: true }))
    try {
      const result = await patientDashboardCounts()
      setState({ counts: result, loading: false, error: null })
    } catch (caught) {
      const asError = caught instanceof Error ? caught : new Error(String(caught))
      setState((before) => ({ ...before, loading: false, error: asError }))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const api = {
    counts,
    loading,
    error,
    reload,
  }
  return api
}

// The Dashboard tab reads `counts` only once `loading` is false and `error` is null — a `null`
// `counts` is "not loaded yet", not "zero patients", so callers never mistake one for the other.
// This hook never touches `usePacientes()`: that one stays reserved for the full registry the
// patient list and import workflows need.

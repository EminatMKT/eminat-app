'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { billingV2Repo, type BillingV2Record } from '@/shared/data'
import type { I18nKey } from '@/shared/i18n'
import type { BillingRecordInput } from '@/features/billing-v2/domain/types'
import mutations from './mutations'
import requestToken from './request-token'

type RecordsState = { records: BillingV2Record[]; loading: boolean; error: I18nKey | null }
const START: RecordsState = { records: [], loading: true, error: null }

/** The billing v2 records every view of the module reads, with their loading, their failure
 *  and the two writes that refresh them. */
export default function useBillingV2Records() {
  const [state, setState] = useState<RecordsState>(START)
  const { records, loading, error } = state
  const token = useRef(requestToken())

  const reload = useCallback(async () => {
    const mine = token.current.claim()
    setState((before) => ({ ...before, loading: true }))
    try {
      const rows = await billingV2Repo.list()
      if (mine()) setState({ records: rows, loading: false, error: null })
    } catch {
      if (mine()) setState({ records: [], loading: false, error: 'billing.loadFailed' })
    }
  }, [])

  useEffect(() => {
    const gate = token.current
    void reload()
    return () => gate.cancel()
  }, [reload])

  const save = useCallback(async (id: string | null, input: BillingRecordInput) => {
    const landed = await mutations.save(id, input)
    if (landed) await reload()
    return landed
  }, [reload])

  const remove = useCallback(async (id: string) => {
    const landed = await mutations.drop(id)
    if (landed) await reload()
    return landed
  }, [reload])

  const api = { records, loading, error, reload, save, remove }
  return api
}

// The one place the module's records live, so the calendar, the reminders and the editor never
// disagree about what is stored: every write reloads the list instead of patching a local copy.
// A read that has been replaced —by a view change, or by the screen going away— is dropped
// rather than applied late, which is what keeps an old answer from overwriting a newer one.
// A failed write never empties the screen: it answers false and the caller keeps what it had.

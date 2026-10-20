'use client'
import { useEffect, useState } from 'react'
import { countPending } from '@/shared/dedup'
import pacienteDedupStrategy from '@/features/medical/utils/pacienteDedupStrategy'

const NONE = 0

/** How many patient duplicate pairs await review, re-read whenever `view` changes; 0 if the read fails. */
export default function usePendingDuplicateCount(view: string) {
  const [count, setCount] = useState<number>(NONE)
  const refresh = async () => {
    const total = await countPending(pacienteDedupStrategy.entidad).catch(() => NONE)
    setCount(total)
  }
  useEffect(() => { void refresh() }, [view])
  return count
}

// Feeds the Duplicates tab's badge. Re-reading on every view change refreshes it when the user
// comes back from a scan, merge or discard; a failed read just hides the badge.

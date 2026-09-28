'use client'
import { useCallback, useRef, useState } from 'react'
import countTone from '../count-tone'
import limitGuard from '../limit-guard'
import type { FieldLimit, LimitState } from '../types'

const UNLIMITED: LimitState = { cut: 0 }

/** The count and the cut notice of a Field's box: its state, its ids and its handlers. */
export default function useLengthLimit(baseId: string, own?: FieldLimit) {
  const [state, setState] = useState(UNLIMITED)
  const { reported, cut } = state
  const armed = useRef(0)
  const limit = own ?? reported
  const max = limit?.max ?? 0
  const ids = { cut: `${baseId}-cut`, count: `${baseId}-count` }

  const report = useCallback((next: FieldLimit) => setState((was) => ({ ...was, reported: next })), [])
  const show = (lost: number) => setState((was) => ({ ...was, cut: lost }))
  // An insertion that loses everything never lands, so no input event follows to settle it.
  const arm = (lost: number, inserted: number) => {
    armed.current = lost < inserted ? lost : 0
    if (lost > 0) show(lost)
  }
  const settle = () => {
    show(armed.current)
    armed.current = 0
  }

  const counted = limit && countTone(limit.length, max) ? [ids.count] : []
  const describedBy = max > 0 ? [ids.cut, ...counted] : []
  const guarded = { ...limitGuard(max, arm), onInput: settle }
  const handlers = max > 0 ? guarded : {}
  const guard = { limit, cut, report, ids, describedBy, handlers }
  return guard
}

// Before an insertion lands it is measured and, if the limit will cut it, armed; the input event
// that follows shows what was armed and disarms. The next edit arms nothing, so its input event
// clears the notice: it stays exactly until the person edits again. The limit comes from the
// Field's native child when it has one, or from what a component control reports.

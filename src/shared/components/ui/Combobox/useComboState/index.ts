'use client'
import { useEffect, useId, useRef, useState } from 'react'
import closeOnOutsidePress from '../outside-press'
import CLOSED from '../closed'

/** Open or closed, the highlight, the root a press outside closes, and the list's DOM id. */
export default function useComboState() {
  const [state, setState] = useState(CLOSED)
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()
  useEffect(() => {
    return closeOnOutsidePress(root, setState)
  }, [])
  const comboState = {
    state,
    setState,
    root,
    listId,
  }
  return comboState
}

// The DOM-facing half of the combobox state, apart from the filtering and picking in
// `useCombobox`, so each reads in one sitting.

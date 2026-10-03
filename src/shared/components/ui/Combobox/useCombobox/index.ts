'use client'
import matches from '../matches'
import keyHandler from '../key-handler'
import useComboState from '../useComboState'
import CLOSED from '../closed'
import type { ComboConfig } from '../types'

const OPENED = { ...CLOSED, open: true }

/** The combobox state: which options show, which one is highlighted and what each key does. */
export default function useCombobox<T>(config: ComboConfig<T>) {
  const {
    options,
    query,
    onType,
    onPick,
    multiple = false,
    pinned,
    text,
  } = config
  const { state, setState, root, listId } = useComboState()
  const shown = matches(options, query, pinned, text)
  const pick = (chosen: T) => { onPick(chosen); if (!multiple) setState(CLOSED) }
  const onOpen = () => setState(OPENED)
  // Typing drops the highlight: the list changed underneath and the old index points at nothing.
  const onTypeText = (typed: string) => { onType(typed); setState(OPENED) }
  const wiring = {
    state,
    setState,
    shown,
    multiple,
    onPick,
  }
  const activeId = state.active in shown ? `${listId}-${state.active}` : undefined
  const combo = {
    root,
    listId,
    shown,
    activeId,
    ...state,
    pick,
    onOpen,
    onType: onTypeText,
    onKeyDown: keyHandler(wiring),
  }
  return combo
}

// The combobox behavior —open, filter, highlight, pick and close— without a line of markup. The
// same hook drives the free-text box (one value, closes on pick) and the multiple one (toggles ids,
// stays open), so both keep one keyboard contract.

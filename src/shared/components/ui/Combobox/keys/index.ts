import CLOSED from '../closed'
import type { ComboState, KeyInput, KeyOutcome } from '../types'

const OPENED: ComboState = { ...CLOSED, open: true }
const STEP: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }
const ESCAPE = 'Escape'
const TAB = 'Tab'
const ENTER = 'Enter'
const OPENERS = [ENTER, ' ', 'ArrowDown']

/** What one key does to the combobox: pure, so the keyboard contract is tested without a DOM. */
export default function onKey(input: KeyInput): KeyOutcome {
  const { state, key, count, multiple } = input
  const { open, active } = state
  if (key === ESCAPE) return { state: CLOSED, handled: open }
  if (key === TAB) return { state: CLOSED, handled: false }
  const opensClosed = multiple && !open && OPENERS.includes(key)
  if (opensClosed) return { state: OPENED, handled: true }
  const inRange = active >= 0 && active < count
  const canPick = key === ENTER && open && inRange
  if (canPick) return { state: multiple ? state : CLOSED, pick: active, handled: true }
  const step = STEP[key]
  if (!step || !count) return { handled: false }
  const first = step > 0 ? 0 : count - 1
  const next = active < 0 ? first : (active + step + count) % count
  return { state: { open: true, active: next }, handled: true }
}

// Escape claims the key only while the panel is open, so the dialog around it does not close in
// the same press; closed, it reaches the dialog as usual. A multiple combobox shows a summary while
// closed, so Enter, Space or ArrowDown are how the keyboard opens it again after an Escape.

import type { Dialog, Focusable, KeyPress } from './types'

const ESCAPE = 'Escape'
const TAB = 'Tab'

export default function dialogKeys({ key, shiftKey, cancel, stop }: KeyPress, { items, active, onClose }: Dialog) {
  if (key === ESCAPE) {
    stop()
    cancel()
    onClose()
    return
  }
  if (key !== TAB) return
  stop()
  const next = edgeTarget(items, items.indexOf(active as Focusable), shiftKey)
  if (next === undefined) return
  cancel()
  next?.focus()
}

// Where Tab must be sent by hand: `undefined` when the browser can move by itself, `null` when
// there is nowhere to go and the focus has to stay put.
function edgeTarget(items: Focusable[], at: number, backwards: boolean) {
  if (items.length === 0) return null
  const last = items.length - 1
  if (backwards) return at <= 0 ? items[last] : undefined
  return at === -1 || at === last ? items[0] : undefined
}

// The two keys a modal dialog owns. Escape is the way out, the same as its ✕ — and in a
// confirmation it is the cancel, because the caller's close IS the cancel. Tab only needs a hand
// at the edges: from the last control it wraps to the first and Shift+Tab the other way, so the
// page behind the backdrop is never reached. Both stop here, so a dialog opened from inside
// another one does not close or move its parent too.

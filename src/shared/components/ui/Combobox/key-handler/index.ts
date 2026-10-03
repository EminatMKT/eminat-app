import onKey from '../keys'
import type { KeyWiring, PressedKey } from '../types'

/** The input's `onKeyDown`: asks `onKey` what the key means and applies it. */
export default function keyHandler<T>(wiring: KeyWiring<T>) {
  const { state, setState, shown, multiple, onPick } = wiring
  return (event: PressedKey) => {
    const pressed = {
      state,
      key: event.key,
      count: shown.length,
      multiple,
    }
    const outcome = onKey(pressed)
    if (outcome.handled) { event.preventDefault(); event.stopPropagation() }
    if (outcome.state) setState(outcome.state)
    if (outcome.pick !== undefined) onPick(shown[outcome.pick])
  }
}

// The glue between the pure key table and React: claiming the key, moving the state, picking.
// A claimed key also stops there, so an Escape that closes the panel does not close the dialog.

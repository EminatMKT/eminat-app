import type { Entry } from './types'

export default function holdFocus({ box, first, active, opener }: Entry) {
  if (!box.contains(active)) (first ?? box).focus()
  return () => {
    if (opener?.isConnected) opener.focus()
  }
}

// Opening a dialog moves the focus inside it, and closing it gives the focus back. Inside means
// the first control the caller chose, or the box itself when there is none — unless a field of
// the dialog already took it with `autoFocus`, which was the caller's own choice. The returned
// function is the way back, to the control that opened the dialog; if that control left the page
// meanwhile (its row was deleted), there is nothing to return to and the focus stays put.

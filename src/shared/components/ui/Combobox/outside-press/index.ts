import CLOSED from '../closed'
import type { ComboState } from '../types'

const POINTER_DOWN = 'pointerdown'

type Root = { current: Pick<Node, 'contains'> | null }

/** Closes the combobox on a press outside its root; returns the cleanup for `useEffect`. */
export default function closeOnOutsidePress(root: Root, setState: (next: ComboState) => void) {
  const outside = ({ target }: Pick<Event, 'target'>) => {
    const inside = target instanceof Node && root.current?.contains(target)
    if (!inside) setState(CLOSED)
  }
  document.addEventListener(POINTER_DOWN, outside)
  return () => document.removeEventListener(POINTER_DOWN, outside)
}

// Like `Dropdown`: `pointerdown` closes before the click lands, so pressing another control opens
// it in the same gesture. It listens on `document` because nothing inside hears a click OUTSIDE.

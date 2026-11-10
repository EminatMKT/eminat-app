/** The inert pointer handler a read-only grid wires in place of a live gesture. */
export default function noopHandler(): void {
  return undefined
}

// noopHandler is the one shared stand-in every gesture's read-only handler set points at.

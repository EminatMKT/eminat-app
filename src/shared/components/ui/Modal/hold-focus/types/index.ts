type Target = { focus(): void }

/** The dialog box: the last resort for the focus, and what tells whether it is already in. */
type Box = Target & { contains(node: unknown): boolean }

/** The control that opened the dialog; it may have left the page by the time it closes. */
type Opener = Target & { isConnected: boolean }

export type Entry = {
  box: Box
  /** The control the focus goes to on open, if the dialog has one. */
  first: Target | undefined
  /** What holds the focus when the dialog opens. */
  active: unknown
  /** Captured before anything inside the dialog took the focus. */
  opener: Opener | null
}

// The shape `holdFocus` works on, kept free of the DOM so its tests can hand in plain objects.
// `contains` is a method and not a function property on purpose: that is what lets a DOM
// element, whose `contains` takes a `Node`, stand in for a box that is asked about anything.

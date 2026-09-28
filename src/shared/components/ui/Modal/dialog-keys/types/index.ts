export type Focusable = { focus(): void }

/** The key that was pressed, and the two ways to answer it. */
export type KeyPress = {
  key: string
  shiftKey: boolean
  /** The browser does not do its default (move the focus, close fullscreen). */
  cancel: () => void
  /** A dialog that holds this one does not hear the key. */
  stop: () => void
}

export type Dialog = {
  /** The dialog's focusable controls, in Tab order. */
  items: Focusable[]
  /** Whatever holds the focus now; it may be none of the items (the box itself). */
  active: unknown
  onClose: () => void
}

// The shapes `dialogKeys` works on, kept free of the DOM so its tests can hand in plain objects.
// The answers to a key are closures and not the event's own methods: a React event's
// `preventDefault` needs its `this`, so the caller wraps them and the handler can destructure.

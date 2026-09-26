const INSERTION = {
  /** The clipboard and drag format that holds plain text. */
  plainText: 'text',
  /** A paste or a typed character takes the place of the selection. */
  replacesSelection: true,
  /** A drop lands at the pointer and leaves the selection alone. */
  landsAtPointer: false,
} as const

/** How each way of inserting text meets the box: where its text is and what it replaces. */
export default INSERTION

// Named here so the guard that measures a paste, a drop and a keystroke reads what each one does
// instead of a bare `true` or `'text'` in the call.

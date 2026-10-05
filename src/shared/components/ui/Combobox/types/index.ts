export type ComboState = {
  open: boolean
  /** The highlighted option; -1 is none, and Enter then lets the typed text stand. */
  active: number
}

export type KeyInput = {
  state: ComboState
  key: string
  count: number
  multiple: boolean
}

export type KeyOutcome = {
  state?: ComboState
  pick?: number
  handled: boolean
}

/** An option of a combobox that picks ids, not free text. */
export type ComboOption = Record<'id' | 'label', string>

/** What a multiple combobox hands its empty state: the search, and how to clear it. */
export type ComboSearch = {
  query: string
  clear: () => void
}

export type ComboConfig<T> = {
  options: T[]
  /** What the box holds: the value itself in free-text mode, the search in multiple mode. */
  query: string
  onType: (typed: string) => void
  onPick: (option: T) => void
  /** Picking toggles and the panel stays open. */
  multiple?: boolean
  pinned?: T
  text?: (option: T) => string
}

/** What the key handler reads and writes. */
export type KeyWiring<T> = {
  state: ComboState
  setState: (next: ComboState) => void
  shown: T[]
  multiple: boolean
  onPick: (option: T) => void
}

/** The part of a key event the handler touches, so a test can hand it a plain object. */
export type PressedKey = Pick<KeyboardEvent, 'key' | 'preventDefault' | 'stopPropagation'>

// The shapes the combobox pieces share: the open/highlight state, what one key does to it, and the
// id-and-label options of the multiple mode. Apart so a piece can import a shape without the hook.

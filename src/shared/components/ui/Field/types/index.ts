import type { ReactNode } from 'react'

/** What a form hands a Field. */
export type FieldProps = {
  label: string
  /** Emoji beside the label. Decorative: it stays out of the accessible name. */
  icon?: string
  required?: boolean
  grande?: boolean
  /** The control grows with its content instead of hiding its beginning. For a title or a URL:
   *  used with a one-row `<textarea>`, which wraps instead of scrolling. */
  crece?: boolean
  /** Why the value is not accepted. Drawn UNDER the control, which gets `aria-invalid` and an
   *  `aria-describedby` pointing at it. Absent or empty: the field is fine. */
  error?: string
  children: ReactNode
}

/** Where pasted or dropped text comes from: the clipboard or the drag. */
type Carrier = { getData: (format: string) => string }

/** A paste, by the two fields read off it. */
type Pasted = { currentTarget: object; clipboardData: Carrier }
/** A drop, by the two fields read off it. */
type Dropped = { currentTarget: object; dataTransfer: Carrier }
/** A keystroke or any other insertion the browser announces before it lands. */
type Inserting = { currentTarget: object; data: string }

/** Told how many characters an insertion loses to the limit, and how many it brought. */
export type LimitArm = (cut: number, inserted: number) => void

/** What measures each insertion before it lands. Each event is typed by the fields read off it,
 *  so the same handler fits an input, a textarea and a select. */
export type LimitHandlers = {
  onPaste: (event: Pasted) => void
  onDrop: (event: Dropped) => void
  onBeforeInput: (event: Inserting) => void
}

/** What a Field hands the control it names, to be spread on it as they are. */
export type ControlProps = {
  /** What the label's `htmlFor` points at. */
  id?: string
  'aria-required'?: boolean
  'aria-invalid'?: boolean
  /** The ids of what is drawn under the control: its error, its cut notice, its count. */
  'aria-describedby'?: string
  /** Once the text has landed: settles the cut notice the insertion before it armed. */
  onInput?: () => void
} & Partial<LimitHandlers>

/** What the Field reads off a native tag: its name, and its length limit if it has one. */
export type NativeProps = ControlProps & { maxLength?: number; value?: unknown }

/** How full a box with a length limit is. */
export type FieldLimit = { length: number; max: number }

/** What a Field remembers about its box's limit between renders. */
export type LimitState = {
  /** How full the box is, as its component control last reported. */
  reported?: FieldLimit
  /** Characters the last insertion lost. Zero: no notice. */
  cut: number
}

/** What the context carries: the props for the control, and where it reports its limit. */
export type FieldChannel = {
  control: ControlProps
  report?: (limit: FieldLimit) => void
}

// The contract between a Field and its control, apart from both: the Field builds it, the
// context carries it and a component that draws a control spreads it. A component control
// reports its length because only it knows its value; a native tag is read by the Field itself.

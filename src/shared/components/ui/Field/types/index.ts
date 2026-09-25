/** What a Field hands the control it names, to be spread on it as they are. */
export type ControlProps = {
  /** What the label's `htmlFor` points at. */
  id?: string
  'aria-required'?: boolean
  'aria-invalid'?: boolean
  /** The id of the error drawn under the control, while there is one. */
  'aria-describedby'?: string
}

// The contract between a Field and its control, apart from both: the Field builds it, the
// context carries it and a component that draws a control spreads it.

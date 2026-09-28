type Edit = {
  /** Characters in the box before the edit. */
  length: number
  /** Characters selected, which the insertion replaces. */
  selected: number
  /** Characters the edit brings. */
  inserted: number
  max: number
}

/** How many characters of an insertion the box's limit throws away. Zero when it all fits. */
export default function overflowOf({ length, selected, inserted, max }: Edit) {
  return Math.max(0, length - selected + inserted - max)
}

// The browser cuts a paste at `maxLength` without a word; this is the arithmetic that lets the
// Field say how much it cut. It runs before the text lands, so it reads the box as it still is.

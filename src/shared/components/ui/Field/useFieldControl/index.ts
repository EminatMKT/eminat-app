'use client'
import { useContext, useEffect } from 'react'
import FieldContext from '../field-context'

type Limit = {
  /** Characters the control holds now. */
  length: number
  /** The `maxLength` it carries. Absent or zero: the control has no limit to report. */
  max?: number
}

export default function useFieldControl(limit?: Limit) {
  const { control, report } = useContext(FieldContext)
  const length = limit?.length ?? 0
  const max = limit?.max ?? 0
  useEffect(() => {
    if (max > 0) report?.({ length, max })
  }, [report, length, max])
  return control
}

// What a component that draws a form control spreads on it to be named by the Field around it:
// the id the label points at and, while the field has an error, `aria-invalid` plus the
// `aria-describedby` that reads the error aloud. A native tag placed straight inside a Field gets
// them without asking; this is for a control a component draws, like billing's `TextControl`.
// Outside a Field it hands nothing, so the same control still renders alone.
//
// A control with a length limit also says how full it is. The Field cannot read that off its
// child —the child is often a component whose props are not the box's—, and it draws the count
// and the cut notice from it. Reported after rendering, because it changes the Field's state.

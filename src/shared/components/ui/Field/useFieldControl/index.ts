'use client'
import { useContext } from 'react'
import FieldContext from '../field-context'

export default function useFieldControl() {
  return useContext(FieldContext)
}

// What a component that draws a form control spreads on it to be named by the Field around it:
// the id the label points at and, while the field has an error, `aria-invalid` plus the
// `aria-describedby` that reads the error aloud. A native tag placed straight inside a Field gets
// them without asking; this is for a control a component draws, like billing's `TextControl`.
// Outside a Field it hands nothing, so the same control still renders alone.

'use client'
import type { SelectHTMLAttributes } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  /** What the blank first choice reads. Without it there is no blank choice at all. */
  placeholder?: string
}

export default function Select({ placeholder, children, ...select }: Props) {
  return (
    <select {...select}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {children}
    </select>
  )
}

// The `<select>` itself, and the one place that decides whether it opens blank. The rule is that a
// required dropdown starts on an empty choice, so whoever fills in a new record cannot keep the
// first option without having picked it. Editing is the other case: a value on a NOT NULL column
// with a DEFAULT never arrives empty, and a blank choice there would be one the database rejects.
// So the prompt is what turns it on — a caller that creates passes one, a caller that edits does
// not.
//
// It lives apart from `CatalogoSelect` so each file draws at most two tags of its own: this one
// the box and its blank choice, that one the catalog options. The options come in as children.

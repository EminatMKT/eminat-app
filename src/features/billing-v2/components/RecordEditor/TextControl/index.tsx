'use client'
import type { HTMLAttributes } from 'react'
import { useFieldControl } from '@/shared/components/ui'

type Props = {
  /** The kind of box the browser draws: plain text, a calendar day or a wall clock. */
  kind: string
  value: string
  onChange: (value: string) => void
  /** The person left the box: from then on its message, if any, is shown. */
  onBlur?: () => void
  /** A note, which needs room to wrap instead of scrolling past its own beginning. */
  multiline?: boolean
  /** The limit of the column the text is stored in: the box stops accepting characters there. */
  maxLength?: number
  /** The keyboard a phone opens for it. */
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
}

export default function TextControl(props: Props) {
  const { kind, value, onChange, onBlur, multiline, maxLength, inputMode } = props
  const named = useFieldControl()
  const shared = { ...named, value, maxLength, onBlur }
  if (multiline) return <textarea {...shared} rows={3} onChange={(e) => onChange(e.target.value)} />
  return <input {...shared} type={kind} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
}

// The typed half of the form. It carries no styles of its own: `Field` dresses the control that
// sits inside it, so an input, a select and a textarea of the same form already look alike.
// What it does own is the shape of the callback — the caller is handed the value, never the
// browser event, so nothing above this file has to know it is reading a DOM target. Its name
// comes from the `Field` around it through `useFieldControl`: the label points at this box.

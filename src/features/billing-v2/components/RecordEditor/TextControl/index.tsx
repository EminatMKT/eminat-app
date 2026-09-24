'use client'

type Props = {
  /** The kind of box the browser draws: plain text, a calendar day or a wall clock. */
  kind: string
  value: string
  onChange: (value: string) => void
  /** A note, which needs room to wrap instead of scrolling past its own beginning. */
  multiline?: boolean
}

export default function TextControl({ kind, value, onChange, multiline }: Props) {
  if (multiline) return <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
  return <input type={kind} value={value} onChange={(e) => onChange(e.target.value)} />
}

// The typed half of the form. It carries no styles of its own: `Field` dresses the control that
// sits inside it, so an input, a select and a textarea of the same form already look alike.
// What it does own is the shape of the callback — the caller is handed the value, never the
// browser event, so nothing above this file has to know it is reading a DOM target.

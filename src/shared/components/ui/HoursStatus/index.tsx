import type { HoursStatusProps } from './types'
import s from './index.module.css'

export default function HoursStatus({ symbol, text, tone }: HoursStatusProps) {
  return (
    <span className={s.root} data-tone={tone}>
      <span aria-hidden="true">{symbol}</span>
      {text}
    </span>
  )
}

// HoursStatus draws a declared-vs-expected comparison: a symbol (the non-color signal) plus the
// text that already states the status on its own, so the symbol stays decorative and hidden.

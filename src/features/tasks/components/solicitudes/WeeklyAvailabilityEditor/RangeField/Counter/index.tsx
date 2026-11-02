import type { CounterProps } from './types'
import s from './index.module.css'

export default function Counter({ id, text, nearLimit }: CounterProps) {
  return <p id={id} data-near-limit={nearLimit} className={s.counter}>{text}</p>
}

// Counter draws one field's character count, split out so RangeField composes it instead of
// drawing its own paragraph for it.

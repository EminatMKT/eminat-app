import type { CounterProps } from './types'

export default function Counter({ id, text, nearLimit }: CounterProps) {
  return <p id={id} data-near-limit={nearLimit}>{text}</p>
}

// Counter draws one field's character count, split out so RangeField composes it instead of
// drawing its own paragraph for it.

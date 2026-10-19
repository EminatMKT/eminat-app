import { useId } from 'react'
import { CHECKBOX } from '@/shared/constants/dom'
import type { Props } from './types'
import s from './index.module.css'

/** Shared checkbox: draws the input and, when disabled, the hint that explains why. */
export default function Checkbox(props: Props) {
  const { checked, onChange, className, children } = props
  const hintId = useId()
  const hint = props.disabled ? props.hint : null
  return (
    <label className={className}>
      <input
        type={CHECKBOX}
        checked={checked}
        disabled={hint !== null}
        aria-describedby={hint !== null ? hintId : undefined}
        onChange={e => onChange(e.target.checked)}
      />
      {children}
      {hint !== null && <span id={hintId} className={s.hint}>{hint}</span>}
    </label>
  )
}

// Shared checkbox: draws the input and, when disabled, the hint that explains why.

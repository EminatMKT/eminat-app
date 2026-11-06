import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import EndTimeControl from './EndTimeControl'

/** Associates the end-time control with its visible label and validation message. */
export default function EndTimeSelect(props: RangeFieldProps) {
  const { id, label, error } = props

  return <>
    <label htmlFor={id}>{label}</label>
    <EndTimeControl {...props} />
    {error && <p id={`${id}-error`} role="alert">{error}</p>}
  </>
}

// Select attributes share RangeField's error-id convention for screen readers.

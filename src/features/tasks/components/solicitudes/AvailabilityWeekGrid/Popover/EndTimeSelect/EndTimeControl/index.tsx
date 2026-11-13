import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import { selectAttributes, renderEndOptions } from './sources'

/** Renders a labeled native end-time select, including the next-day midnight boundary. */
export default function EndTimeControl(props: RangeFieldProps) {
  return <select {...selectAttributes(props)} aria-label={props.label}>
    <option value="" disabled />
    {renderEndOptions(props.value)}
  </select>
}

// The disabled blank option preserves the required select's empty initial state.

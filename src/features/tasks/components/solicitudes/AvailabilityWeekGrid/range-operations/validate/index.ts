import { validateRanges } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'

/** Accepts only complete weekly arrays with valid times and no same-day overlaps. */
export default function commitRange(ranges: EditableRange[]): EditableRange[] | null {
  const errors = validateRanges(ranges)
  const valid = errors.length === 0
  const result = valid ? ranges : null

  return result
}

// The grid uses this guard before propagating any create, resize, or popover save.

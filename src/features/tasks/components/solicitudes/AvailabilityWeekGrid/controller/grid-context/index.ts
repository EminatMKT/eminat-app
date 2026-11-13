import type { AvailabilityWeekGridProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { GridActionContext } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/controller/actions/types'
import type { Select } from '../types'

/** Bridges the grid's own props into the mutation context createGridActions needs - the one
 *  place AvailabilityWeekGridProps meets GridActionContext, plus the given `select` and
 *  `markCreated` setters. */
export default function gridContext(
  { ranges, readOnly, onChange }: AvailabilityWeekGridProps,
  select: Select,
  markCreated: Select,
): GridActionContext {
  const context = {
    ranges,
    readOnly,
    onChange,
    select,
    markCreated,
  }

  return context
}

// Kept apart from useGridController so each stays within its own ten-line budget.

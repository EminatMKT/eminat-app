import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'

const EMPTY_NOTE = ''
const LIST_SEPARATOR = '\n'

const normalizeRange = ({ id: _id, clientId: _clientId, ...rest }: EditableRange) => ({
  ...rest,
  note: rest.note?.trim() || EMPTY_NOTE,
})

const toKey = (range: EditableRange): string => JSON.stringify(normalizeRange(range))

const toSortedKeys = (ranges: EditableRange[]): string[] => {
  const keys = ranges.map(toKey)
  const sortedKeys = keys.sort()

  return sortedKeys
}

/** Whether the live ranges differ from the last-saved baseline, ignoring `id`/`clientId` and
 *  their order: the same weekday/time/note values in any order is not a change. */
export default function rangesHaveChanged(
  saved: EditableRange[],
  current: EditableRange[],
): boolean {
  const savedList = toSortedKeys(saved).join(LIST_SEPARATOR)
  const currentList = toSortedKeys(current).join(LIST_SEPARATOR)

  return savedList !== currentList
}

// Captured once on load and refreshed after every successful save, so the controller can hold a
// `savedRanges` baseline without carrying this comparison logic inline.

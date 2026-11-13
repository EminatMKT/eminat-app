import { endMinutesOf, minutesOf } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import { PIXELS_PER_MINUTE } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import { replaceBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/range-operations'
import type { ReadSegment, ResizeCommitCallback, SegmentResizeInput } from '../types'

function snapshot({ range, ranges }: SegmentResizeInput) {
  const currentBounds = { start: minutesOf(range.startsAt), end: endMinutesOf(range.endsAt) }
  const otherDayRanges = ranges.filter(item =>
    item.weekday === range.weekday && item.clientId !== range.clientId)
  const result = { currentBounds, otherDayRanges }

  return result
}

function commitResize(read: ReadSegment, next: EditableRange[] | null) {
  const { readOnly, ranges, range, onChange } = read()
  const exists = ranges.some(item => item.clientId === range.clientId)

  if (!readOnly && exists && next) onChange(next)
}

/** Freezes neighbor bounds at capture but resolves geometry and the containing week live. */
export default function configuration(read: ReadSegment) {
  const column = { get columnTop() { return read().columnTop() }, pxPerMin: PIXELS_PER_MINUTE }
  const onCommit: ResizeCommitCallback = ({ bounds }) =>
    commitResize(read, replaceBounds(read().ranges, read().range, bounds))
  const live = { column, onCommit, readOnly: read().readOnly }
  const config = { ...snapshot(read()), ...live }

  return config
}

// The pointer adapter owns capture; this configuration owns live whole-week validation.

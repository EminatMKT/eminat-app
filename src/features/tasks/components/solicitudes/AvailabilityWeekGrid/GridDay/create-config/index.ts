import { PIXELS_PER_MINUTE } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import type { CreateGestureConfig } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/create-gesture/types'
import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'

type ReadDay = () => GridDayProps

function dayRangesOf(props: GridDayProps) {
  return props.ranges.filter(range => range.weekday === props.day.weekday)
}

function onCommitOf(read: ReadDay): CreateGestureConfig['onCommit'] {
  return ({ bounds, openPopover }) => {
    const { day, onCreate } = read()

    onCreate(day, bounds, openPopover)
  }
}

/** One day's pointer-create config: live day ranges and read-only state through `read`, the
 *  column geometry through `columnTop`, committing straight into the grid's fixed onCreate. */
export default function createConfig(read: ReadDay, columnTop: () => number): CreateGestureConfig {
  const column = { get columnTop() { return columnTop() }, pxPerMin: PIXELS_PER_MINUTE }
  const live = { column, onCommit: onCommitOf(read) }
  const config = {
    get dayRanges() { return dayRangesOf(read()) },
    get readOnly() { return read().readOnly },
    ...live,
  }

  return config
}

// Mirrors SegmentCanvas's resize-pointer configuration: live reads, never a frozen snapshot.

import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { AvailabilityWeekGridProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { PopoverProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/types'
import type { PopoverContext, Translate } from '../types'

function dayLabelOf({ weekday }: EditableRange, t: Translate) {
  const day = AVAILABILITY_DAYS.find(entry => entry.weekday === weekday)

  return day ? t(day.labelKey) : ''
}

function popoverIdentity(range: EditableRange, { ranges }: AvailabilityWeekGridProps) {
  return { range, rangeIndex: ranges.indexOf(range), ranges }
}

function popoverDialog({ actions }: PopoverContext) {
  const { onSave, onRemove, onClose } = actions

  return { onSave, onRemove, onClose }
}

function popoverFields(range: EditableRange, context: PopoverContext): PopoverProps {
  const { props, t } = context
  const identity = popoverIdentity(range, props)
  const display = { dayLabel: dayLabelOf(range, t), readOnly: props.readOnly }
  const fields = { ...identity, ...display, ...popoverDialog(context) }

  return fields
}

/** The selected range's Popover props, or null until a range is open - the grid's one place
 *  that turns a bare `clientId` back into the identity-matched range Popover needs. */
export default function popoverOf(
  context: PopoverContext,
  selectedId: string | null,
): PopoverProps | null {
  const { ranges } = context.props
  const range = ranges.find(item => item.clientId === selectedId)

  return range ? popoverFields(range, context) : null
}

// identity/display/dialog stay at three fields or fewer each, mirroring Popover/fields-input's
// own precedent for building a many-property shape without a four-plus-property literal.

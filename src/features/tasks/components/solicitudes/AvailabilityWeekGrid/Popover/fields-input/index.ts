import type { PopoverControllerResult } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/controller/types'
import type { PopoverFieldsInput } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/popover-fields/types'
import type { PopoverProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/types'

function fieldsIdentity(props: PopoverProps) {
  const { range, dayLabel, readOnly } = props

  return { range, dayLabel, readOnly }
}

function fieldsState(controller: PopoverControllerResult) {
  const { draft, error, changeField } = controller

  return { draft, error, changeField }
}

/** Bridges Popover's own props and its controller's result into the one shape buildPopoverFields
 *  needs, so Popover's component composes them without touching either shape's internals. */
export default function buildFieldsInput(
  props: PopoverProps,
  controller: PopoverControllerResult,
): PopoverFieldsInput {
  return { ...fieldsIdentity(props), ...fieldsState(controller) }
}

// Splits into identity (display-only props) and state (controller-derived) so neither half ever
// needs a 4-plus-property shape of its own; buildFieldsInput just spreads both together.

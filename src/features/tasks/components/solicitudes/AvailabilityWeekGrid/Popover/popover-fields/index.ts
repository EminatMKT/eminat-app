import buildAvailabilityRangeItemFields from '../view-model/fields'
import type {
  AvailabilityRangeItemProps,
  AvailabilityRangeItemChangeHandler,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/types'
import type { Translator } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { PopoverChangeFieldHandler } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/controller/types'
import type {
  PopoverFields,
  PopoverFieldsInput,
  ReadOnlyOverlay,
} from './types'

const POPOVER_RANGE_INDEX = 0
const noopRemove = () => undefined

function buildPopoverErrors(error: RangeValidationError | undefined): RangeValidationError[] {
  return error ? [{ ...error, rangeIndex: POPOVER_RANGE_INDEX }] : []
}

function adaptOnChange(changeField: PopoverChangeFieldHandler): AvailabilityRangeItemChangeHandler {
  return (_clientId, field, value) => changeField(field, value)
}

function buildItemProps(fieldsInput: PopoverFieldsInput): AvailabilityRangeItemProps {
  const { range, draft, error, dayLabel, changeField } = fieldsInput
  const identity = { range: { ...range, ...draft }, rangeIndex: POPOVER_RANGE_INDEX, number: 1 }
  const display = { dayLabel, errors: buildPopoverErrors(error) }
  const actions = { onChange: adaptOnChange(changeField), onRemove: noopRemove }
  const itemProps = { ...identity, ...display, ...actions }

  return itemProps
}

function applyReadOnly(overlay: ReadOnlyOverlay): PopoverFields {
  const { fields, readOnly } = overlay
  const startField = { ...fields.startField, disabled: readOnly }
  const endField = { ...fields.endField, disabled: readOnly }
  const noteField = { ...fields.noteField, disabled: readOnly }
  const popoverFields = { startField, endField, noteField }

  return popoverFields
}

/** Reuses view-model/fields's id/label/error logic on a draft-shimmed range, then overlays
 *  `disabled: readOnly` so view mode disables every field without duplicating that logic. */
export default function buildPopoverFields(
  fieldsInput: PopoverFieldsInput,
  translate: Translator,
): PopoverFields {
  const itemProps = buildItemProps(fieldsInput)
  const fields = buildAvailabilityRangeItemFields(itemProps, translate)
  const overlay: ReadOnlyOverlay = { fields, readOnly: fieldsInput.readOnly }
  const popoverFields = applyReadOnly(overlay)

  return popoverFields
}

// identity/display/actions stay at three fields or fewer each so none of them needs its own
// multiline literal; the final shape is always the spread of those three groups.

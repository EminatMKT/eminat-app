import { RANGE_FIELD_CONSTANTS } from './constants'

/** The native input kinds supported by a single availability range field. */
export type RangeFieldInputType =
  | typeof RANGE_FIELD_CONSTANTS.timeInputType
  | typeof RANGE_FIELD_CONSTANTS.textInputType
  | typeof RANGE_FIELD_CONSTANTS.textareaInputType

/** Props for one visible, labeled availability range field. */
export type RangeFieldProps = {
  id: string
  inputType: RangeFieldInputType
  label: string
  value: string
  error?: string
  counterText?: string
  counterNearLimit?: boolean
  /** Read-only view: the Popover's view mode disables every field, with no save/delete controls. */
  disabled?: boolean
  onChange: (value: string) => void
}

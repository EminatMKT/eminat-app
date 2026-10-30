import RANGE_FIELD_CONSTANTS from './constants'

/** The native input kinds supported by a single availability range field. */
export type RangeFieldInputType =
  | typeof RANGE_FIELD_CONSTANTS.timeInputType
  | typeof RANGE_FIELD_CONSTANTS.textInputType

/** Props for one visible, labeled availability range field. */
export type RangeFieldProps = {
  id: string
  inputType: RangeFieldInputType
  label: string
  value: string
  error?: string
  counterText?: string
  counterNearLimit?: boolean
  onChange: (value: string) => void
}

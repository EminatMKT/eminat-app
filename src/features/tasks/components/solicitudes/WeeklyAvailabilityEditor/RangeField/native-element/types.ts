import { RANGE_FIELD_CONSTANTS } from '../constants'

/** The tag RangeField renders: a native input, or a textarea for multi-line notes. */
export type NativeElementTag =
  | typeof RANGE_FIELD_CONSTANTS.nativeInputTag
  | typeof RANGE_FIELD_CONSTANTS.textareaInputType

/** The attributes only an `<input>` accepts, never a `<textarea>`. */
export type NativeOnlyProps = {
  type?: typeof RANGE_FIELD_CONSTANTS.timeInputType | typeof RANGE_FIELD_CONSTANTS.textInputType
  step?: number
}

/** Which native tag renders a field, and the input-only attributes it carries. */
export type NativeElement = {
  tag: NativeElementTag
  nativeOnlyProps: NativeOnlyProps
}

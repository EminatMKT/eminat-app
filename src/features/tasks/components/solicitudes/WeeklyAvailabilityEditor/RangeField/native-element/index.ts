import { RANGE_FIELD_CONSTANTS } from '../constants'
import type { RangeFieldInputType } from '../types'
import type { NativeElement } from './types'

const TIME_ONLY_PROPS = {
  type: RANGE_FIELD_CONSTANTS.timeInputType,
  step: RANGE_FIELD_CONSTANTS.timeStep,
}
const TEXT_ONLY_PROPS = {
  type: RANGE_FIELD_CONSTANTS.textInputType,
}
const TEXTAREA_ONLY_PROPS = {}

/** Each input kind's native tag and the tag-only attributes it carries. */
const NATIVE_ELEMENT_BY_INPUT_TYPE: Record<RangeFieldInputType, NativeElement> = {
  [RANGE_FIELD_CONSTANTS.timeInputType]: {
    tag: RANGE_FIELD_CONSTANTS.nativeInputTag,
    nativeOnlyProps: TIME_ONLY_PROPS,
  },
  [RANGE_FIELD_CONSTANTS.textInputType]: {
    tag: RANGE_FIELD_CONSTANTS.nativeInputTag,
    nativeOnlyProps: TEXT_ONLY_PROPS,
  },
  [RANGE_FIELD_CONSTANTS.textareaInputType]: {
    tag: RANGE_FIELD_CONSTANTS.textareaInputType,
    nativeOnlyProps: TEXTAREA_ONLY_PROPS,
  },
}

/** Resolves which native tag renders a field, and the tag-only attributes it carries. */
export default function resolveNativeElement(inputType: RangeFieldInputType): NativeElement {
  const element = NATIVE_ELEMENT_BY_INPUT_TYPE[inputType]

  return element
}

// This module isolates which native tag and tag-only attributes RangeField renders, so the
// component itself never branches on inputType to pick between <input> and <textarea>.

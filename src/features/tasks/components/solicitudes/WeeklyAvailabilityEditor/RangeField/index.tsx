import type { ChangeEvent } from 'react'
import Counter from './Counter'
import { RANGE_FIELD_CONSTANTS } from './constants'
import resolveNativeElement from './native-element'
import resolveDescribedByIds from './described-by'
import type { DescribedByIds } from './described-by/types'
import type { RangeFieldProps } from './types'

type NativeChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>

/** The native tag plus its id, tag-only attributes, value and note-length cap. */
function buildNativeElement({ id, inputType, value }: RangeFieldProps) {
  const { tag, nativeOnlyProps } = resolveNativeElement(inputType)
  const isTimeInput = inputType === RANGE_FIELD_CONSTANTS.timeInputType
  const maxLength = isTimeInput ? undefined : RANGE_FIELD_CONSTANTS.noteMaxLength
  const baseAttrs = { id, ...nativeOnlyProps, value }
  const nativeAttrs = { ...baseAttrs, maxLength }

  return { tag, nativeAttrs }
}

/** Disabled state and the change handler that forwards only the new text. */
function buildControlAttrs({ disabled, onChange }: RangeFieldProps) {
  const handleChange = (event: NativeChangeEvent) => onChange(event.target.value)

  return { disabled, onChange: handleChange }
}

/** Links the native element to its validity, its describing messages and its label. */
function buildAriaAttrs({ error, label }: RangeFieldProps, describedBy: string | undefined) {
  const ariaInvalid = error ? true : undefined

  return { 'aria-invalid': ariaInvalid, 'aria-describedby': describedBy, 'aria-label': label }
}

/** The optional validation message and the optional character counter. */
function renderFeedback(props: RangeFieldProps, ids: DescribedByIds) {
  const { error, counterText, counterNearLimit } = props
  const { errorId, counterId } = ids
  const errorText = error && <p id={errorId} role={RANGE_FIELD_CONSTANTS.alertRole}>{error}</p>
  const counter = counterText && (
    <Counter id={counterId ?? ''} text={counterText} nearLimit={counterNearLimit} />
  )

  return <>{errorText}{counter}</>
}

/** A visible label, native input or textarea, and optional linked validation message. */
export default function RangeField(props: RangeFieldProps) {
  const { id, label } = props
  const { tag: Tag, nativeAttrs } = buildNativeElement(props)
  const ids = resolveDescribedByIds(props)
  const ariaAttrs = buildAriaAttrs(props, ids.describedBy)
  const tagAttrs = { ...nativeAttrs, ...buildControlAttrs(props), ...ariaAttrs }
  const feedback = renderFeedback(props, ids)

  return <><label htmlFor={id}>{label}</label><Tag {...tagAttrs} />{feedback}</>
}

// This module keeps one availability value's native semantics together.
// Callers provide translated labels and validation copy; this unit only links them.

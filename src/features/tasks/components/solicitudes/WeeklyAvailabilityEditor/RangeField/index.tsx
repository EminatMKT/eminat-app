import type { ChangeEvent } from 'react'
import Counter from './Counter'
import RANGE_FIELD_CONSTANTS from './constants'
import resolveNativeElement from './native-element'
import type { RangeFieldProps } from './types'

type NativeChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>

/** A visible label, native input or textarea, and optional linked validation message. */
export default function RangeField(props: RangeFieldProps) {
  const {
    id,
    inputType,
    label,
    value,
    error,
    counterText,
    counterNearLimit,
    onChange,
  } = props

  const isDefined = (candidate: string | undefined): candidate is string => candidate !== undefined
  const errorId = error ? `${id}${RANGE_FIELD_CONSTANTS.errorSuffix}` : undefined
  const counterId = counterText ? `${id}${RANGE_FIELD_CONSTANTS.counterSuffix}` : undefined
  const describedByIds = [errorId, counterId].filter(isDefined)
  const describedBy = describedByIds.length > 0
    ? describedByIds.join(RANGE_FIELD_CONSTANTS.describedBySeparator)
    : undefined
  const handleChange = (event: NativeChangeEvent) => onChange(event.target.value)
  const inputMaxLength = inputType === RANGE_FIELD_CONSTANTS.timeInputType
    ? undefined
    : RANGE_FIELD_CONSTANTS.noteMaxLength
  const { tag: Tag, nativeOnlyProps } = resolveNativeElement(inputType)

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <Tag
        id={id}
        {...nativeOnlyProps}
        value={value}
        maxLength={inputMaxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-label={label}
        onChange={handleChange}
      />
      {error && <p id={errorId} role={RANGE_FIELD_CONSTANTS.alertRole}>{error}</p>}
      {counterText && (
        <Counter id={counterId ?? ''} text={counterText} nearLimit={counterNearLimit} />
      )}
    </>
  )
}

// This module keeps one availability value's native semantics together.
// Callers provide translated labels and validation copy; this unit only links them.

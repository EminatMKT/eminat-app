import { Children } from 'react'
import COMPOSITION_CONSTANTS from './constants'
import type { WeeklyAvailabilityEditorCompositionProps } from './types'

const VALIDATION_CLASS = 'weekly-availability-editor-validation'

/** Composes the seven domain-specific day views, summary, validation, and actions. */
export default function WeeklyAvailabilityEditorComposition(
  props: WeeklyAvailabilityEditorCompositionProps,
) {
  const {
    monday, tuesday, wednesday, thursday, friday, saturday, sunday,
    weeklySummary, validationMessage, validationFocusRef, actions,
  } = props
  const allDayViews = [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
  const dayViews = Children.toArray(allDayViews)
  const validation = validationMessage == null
    ? null
    : (
      <div
        className={VALIDATION_CLASS}
        id={COMPOSITION_CONSTANTS.validationId}
        ref={validationFocusRef}
        role={COMPOSITION_CONSTANTS.validationRole}
        aria-live={COMPOSITION_CONSTANTS.validationLive}
        tabIndex={COMPOSITION_CONSTANTS.validationTabIndex}
      >
        {validationMessage}
      </div>
    )

  return (
    <>
      <div>{dayViews}</div>
      {weeklySummary}
      {validation}
      {actions}
    </>
  )
}

// WeeklyAvailabilityEditorComposition keeps the seven-day layout and validation focus contract together.

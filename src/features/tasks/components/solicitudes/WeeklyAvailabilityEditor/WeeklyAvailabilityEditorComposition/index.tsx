import { Children } from 'react'
import COMPOSITION_CONSTANTS from './constants'
import type { WeeklyAvailabilityEditorCompositionProps } from './types'
import s from './index.module.css'

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
        className={s.validation}
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
    <div className={s.editor}>
      <div className={s.days}>{dayViews}</div>
      {weeklySummary}
      {validation}
      {actions}
    </div>
  )
}

// WeeklyAvailabilityEditorComposition keeps the seven-day layout and validation focus contract together.

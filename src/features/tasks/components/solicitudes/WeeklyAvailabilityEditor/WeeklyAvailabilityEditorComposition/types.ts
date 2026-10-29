import type { ReactElement, RefObject } from 'react'

/** Props for the composed weekly availability editor view. */
export type WeeklyAvailabilityEditorCompositionProps = {
  monday: ReactElement
  tuesday: ReactElement
  wednesday: ReactElement
  thursday: ReactElement
  friday: ReactElement
  saturday: ReactElement
  sunday: ReactElement
  weeklySummary: ReactElement
  validationMessage: string | null
  validationFocusRef: RefObject<HTMLDivElement>
  actions: ReactElement
}

import type { RangeValidationError, Weekday, WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { DaySectionProps, EditableRange } from '../component-types'

/** The overlap discriminator used while projecting validation errors. */
export const OVERLAP_CODE = 'overlap'

type ProjectDayErrorsSource = Pick<DaySectionProps, 'errors'> &
  Pick<EditableRange, 'weekday'> & {
    ranges: WeeklyAvailabilityRange[]
  }

export type ProjectDayErrorsInput = ProjectDayErrorsSource & Pick<WeeklyAvailabilityRange, 'weekday'> & {
  weekday: Weekday
}

export type ProjectDayError = RangeValidationError

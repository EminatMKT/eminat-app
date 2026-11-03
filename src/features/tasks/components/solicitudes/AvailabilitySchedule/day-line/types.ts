import type { AvailabilityDay, WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { I18nKey } from '@/shared/i18n'
import type { Vars } from '@/shared/i18n/types'

export type Translate = (key: I18nKey, vars?: Vars) => string

export type BuildDayLineInput = {
  day: AvailabilityDay
  ranges: WeeklyAvailabilityRange[]
  hoursPerDay: number | null
  t: Translate
}

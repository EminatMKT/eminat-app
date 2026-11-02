import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { I18nKey } from '@/shared/i18n'
import type { Vars } from '@/shared/i18n/types'
import type {
  AvailabilityDay,
} from '@/features/tasks/components/solicitudes/MemberAvailabilityCard/constants'

export type Translate = (key: I18nKey, vars?: Vars) => string

export type BuildDayLineInput = {
  day: AvailabilityDay
  ranges: WeeklyAvailabilityRange[]
  hoursPerDay: number | null
  t: Translate
}

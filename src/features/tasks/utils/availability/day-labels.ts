import type { I18nKey } from '@/shared/i18n'
import type { DailyHoursStatus, Weekday } from './types'

export type AvailabilityDay = {
  weekday: Weekday
  labelKey: I18nKey
}

export const AVAILABILITY_DAYS: AvailabilityDay[] = [
  { weekday: 1, labelKey: 'tasks.availability.monday' },
  { weekday: 2, labelKey: 'tasks.availability.tuesday' },
  { weekday: 3, labelKey: 'tasks.availability.wednesday' },
  { weekday: 4, labelKey: 'tasks.availability.thursday' },
  { weekday: 5, labelKey: 'tasks.availability.friday' },
  { weekday: 6, labelKey: 'tasks.availability.saturday' },
  { weekday: 7, labelKey: 'tasks.availability.sunday' },
]

export const STATUS_SYMBOLS: Record<DailyHoursStatus, string> = {
  below: '↓',
  complete: '✓',
  above: '↑',
  unavailable: '—',
}

export const STATUS_COPY_KEYS: Record<DailyHoursStatus, I18nKey> = {
  below: 'tasks.availability.dayBelow',
  complete: 'tasks.availability.dayComplete',
  above: 'tasks.availability.dayAbove',
  unavailable: 'tasks.availability.noWorkday',
}

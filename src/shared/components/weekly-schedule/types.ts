import type { HoursStatusTone } from '@/shared/components/ui'

/** One rendered weekday row: everything `WeeklySchedule` draws for that day, already resolved
 *  into display strings by the caller (i18n, labels, hour math) — this component itself has no
 *  domain or i18n awareness, only visual composition. */
export type WeeklyScheduleLine = {
  key: string | number
  label: string
  rangesText: string
  statusSymbol: string
  statusTone: HoursStatusTone
  statusText: string
}

export type WeeklyScheduleProps = {
  totalText: string
  lines: WeeklyScheduleLine[]
}

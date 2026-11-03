'use client'
import { useMemo } from 'react'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { AVAILABILITY_DAYS, declaredWeeklyHours, sortRanges } from '@/features/tasks/utils/availability'
import { useT } from '@/shared/i18n'
import WeeklySchedule from '@/shared/components/weekly-schedule'
import buildDayLine from './day-line'

type Props = {
  member: AvailabilityMemberDto
}

/** Full read-only weekly breakdown: every weekday, its ranges and notes, and how the day's
 *  declared hours compare to the member's jornada. `MemberAvailabilityModal` is its only caller
 *  — the editable branch mounts `WeeklyAvailabilityEditor` instead, never this. Resolves i18n and
 *  per-day comparisons itself; the shared `WeeklySchedule` only draws the already-resolved rows. */
export default function AvailabilitySchedule({ member }: Props) {
  const { t } = useT()
  const ranges = useMemo(() => sortRanges(member.ranges), [member.ranges])
  const notConfiguredText = t('tasks.availability.notConfigured')

  if (ranges.length === 0) return notConfiguredText

  const weeklyHours = declaredWeeklyHours(ranges)
  const weekDeclaredVars = { hours: weeklyHours }
  const totalText = t('tasks.availability.weekDeclared', weekDeclaredVars)
  const hoursPerDay = member.workday?.hoursPerDay ?? null
  const lines = AVAILABILITY_DAYS.map(day => {
    const dayLineInput = {
      day,
      ranges,
      hoursPerDay,
      t,
    }

    return {
      key: day.weekday,
      ...buildDayLine(dayLineInput),
    }
  })

  return <WeeklySchedule totalText={totalText} lines={lines} />
}

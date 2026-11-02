'use client'
import { useMemo } from 'react'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { declaredWeeklyHours, sortRanges } from '@/features/tasks/utils/availability'
import { useT } from '@/shared/i18n'
import { HoursStatus, ListaRotulada } from '@/shared/components/ui'
import { AVAILABILITY_DAYS } from '../MemberAvailabilityCard/constants'
import buildDayLine from './day-line'

type Props = {
  member: AvailabilityMemberDto
}

/** Full read-only weekly breakdown: every weekday, its ranges and notes, and how the day's
 *  declared hours compare to the member's jornada. `MemberAvailabilityModal` is its only caller
 *  — the editable branch mounts `WeeklyAvailabilityEditor` instead, never this. */
export default function AvailabilitySchedule({ member }: Props) {
  const { t } = useT()
  const ranges = useMemo(() => sortRanges(member.ranges), [member.ranges])
  const notConfiguredText = t('tasks.availability.notConfigured')

  if (ranges.length === 0) return notConfiguredText

  const weeklyHours = declaredWeeklyHours(ranges)
  const weekDeclaredVars = { hours: weeklyHours }
  const total = t('tasks.availability.weekDeclared', weekDeclaredVars)
  const hoursPerDay = member.workday?.hoursPerDay ?? null

  return (
    <>
      {total}
      {AVAILABILITY_DAYS.map(day => {
        const dayLineInput = {
          day,
          ranges,
          hoursPerDay,
          t,
        }
        const line = buildDayLine(dayLineInput)

        return (
          <ListaRotulada key={day.weekday} label={line.label}>
            {line.rangesText}
            <HoursStatus symbol={line.statusSymbol} tone={line.statusTone} text={line.statusText} />
          </ListaRotulada>
        )
      })}
    </>
  )
}

// Every weekday renders through the shared ListaRotulada/HoursStatus pair, never a markup block
// of this file's own: the day label and its ranges are text, not a hand-drawn <section>/<h3>.

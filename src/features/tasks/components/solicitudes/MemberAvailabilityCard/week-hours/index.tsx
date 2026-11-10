'use client'
import {
  compareDailyHours,
  comparisonCopyVars,
  declaredWeeklyHours,
  STATUS_SYMBOLS,
} from '@/features/tasks/utils/availability'
import { useT } from '@/shared/i18n'
import { HoursStatus } from '@/shared/components/ui'
import { WEEK_STATUS_COPY_KEYS } from '../constants'
import type { WeekHoursProps } from './types'

/** The declared-vs-expected week badge for a member who has a jornada to compare against. */
export default function WeekHours({ member }: WeekHoursProps) {
  const { t } = useT()
  const hours = declaredWeeklyHours(member.ranges)
  const comparison = compareDailyHours(hours, member.workday?.hoursPerWeek ?? null)
  const { status } = comparison
  const badgeText = t(WEEK_STATUS_COPY_KEYS[status], comparisonCopyVars(comparison))

  return <HoursStatus symbol={STATUS_SYMBOLS[status]} text={badgeText} tone={status} />
}

// Renders the card's week total: a jornada sets hours per week, so the week is what is compared.

'use client'
import { Eye, Pencil } from 'lucide-react'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import {
  compareDailyHours,
  comparisonCopyVars,
  declaredWeeklyHours,
  expectedWeeklyHours,
  STATUS_SYMBOLS,
} from '@/features/tasks/utils/availability'
import { useT } from '@/shared/i18n'
import { HoursStatus, Pressable } from '@/shared/components/ui'
import PersonSummary from '@/shared/components/PersonSummary'
import memberInitials from './member-initials'
import {
  CARD_ICON_SIZE,
  EDIT_SCHEDULE_KEY,
  NO_JORNADA_KEY,
  OPEN_SCHEDULE_KEY,
  WEEK_STATUS_COPY_KEYS,
} from './constants'
import s from './index.module.css'

type Props = {
  member: AvailabilityMemberDto
  onOpen: () => void
}

/** Adapts one availability member into the compact card: the whole surface opens the member's
 *  weekly schedule. Identity sits on the left; the declared-vs-expected hours badge and the
 *  pencil/eye icon — whether this card is the viewer's own editable row — sit on the right. */
export default function MemberAvailabilityCard({ member, onOpen }: Props) {
  const { t } = useT()
  let expectedHours: number | null = null

  if (member.workday) expectedHours = expectedWeeklyHours(member.workday.hoursPerDay)
  const weeklyHours = declaredWeeklyHours(member.ranges)
  const comparison = compareDailyHours(weeklyHours, expectedHours)
  const badgeText = t(WEEK_STATUS_COPY_KEYS[comparison.status], comparisonCopyVars(comparison))
  const scheduleVars = { name: member.name }
  const scheduleLabelKey = member.canEdit ? EDIT_SCHEDULE_KEY : OPEN_SCHEDULE_KEY
  const accessibleLabel = t(scheduleLabelKey, scheduleVars)

  const hoursBadge = <HoursStatus
    symbol={STATUS_SYMBOLS[comparison.status]}
    text={badgeText}
    tone={comparison.status}
  />
  const declaredVars = { hours: weeklyHours }
  const noWorkdayText = <span className={s.total}>{t(NO_JORNADA_KEY, declaredVars)}</span>
  const pencilIcon = <Pencil aria-hidden="true" size={CARD_ICON_SIZE} className={s.pencilIcon} />
  const eyeIcon = <Eye aria-hidden="true" size={CARD_ICON_SIZE} className={s.icon} />
  const statusBadge = member.workday ? hoursBadge : noWorkdayText
  const statusIcon = member.canEdit ? pencilIcon : eyeIcon

  return (
    <Pressable accessibleLabel={accessibleLabel} onClick={onOpen} className={s.card}>
      <PersonSummary
        initials={memberInitials(member.name)}
        size="lg"
        name={member.name}
        subtitle={member.team?.name}
      />
      <div className={s.meta}>
        {statusBadge}
        {statusIcon}
      </div>
    </Pressable>
  )
}

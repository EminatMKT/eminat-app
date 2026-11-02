'use client'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { declaredWeeklyHours } from '@/features/tasks/utils/availability'
import { useT } from '@/shared/i18n'
import { Pressable } from '@/shared/components/ui'
import s from './index.module.css'

type Props = {
  member: AvailabilityMemberDto
  onOpen: () => void
}

/** Compact summary: name, team, and one weekly-total line. The whole card presses to the full
 *  schedule — editable or read-only, `MemberAvailabilityModal` decides which. */
export default function MemberAvailabilityCard({ member, onOpen }: Props) {
  const { t } = useT()
  const hasSchedule = member.ranges.length > 0
  const weeklyHours = declaredWeeklyHours(member.ranges)
  const summary = hasSchedule
    ? t('tasks.availability.weekDeclared', { hours: weeklyHours })
    : t('tasks.availability.notConfigured')
  const accessibleLabel = t('tasks.availability.openSchedule', { name: member.name })

  return (
    <Pressable accessibleLabel={accessibleLabel} className={s.card} onClick={onOpen}>
      <div className={s.persona}>
        <div className={s.avatar}>{member.name.at(0) ?? '?'}</div>
        <div>
          <h2 className={s.nombre}>{member.name}</h2>
          {member.team && <p className={s.resumen}>{member.team.name}</p>}
        </div>
      </div>
      <p className={s.total}>{summary}</p>
    </Pressable>
  )
}

'use client'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { declaredWeeklyHours } from '@/features/tasks/utils/availability'
import { useT } from '@/shared/i18n'
import { Pressable } from '@/shared/components/ui'
import PersonSummary from '@/shared/components/PersonSummary'
import s from './index.module.css'

type Props = {
  member: AvailabilityMemberDto
  onOpen: () => void
}

const NAME_SEPARATOR = ' '
const INITIALS_SIZE = 2
const FIRST_INDEX = 0
const LAST_OFFSET = 1

function isWord(value: string): value is string {
  return value.length > 0
}

function memberInitials(name: string): string {
  const words = name.split(NAME_SEPARATOR).filter(isWord)
  const first = words[FIRST_INDEX] ?? ''
  const last = words[words.length - LAST_OFFSET] ?? ''
  const letters = `${first[FIRST_INDEX] ?? ''}${last[FIRST_INDEX] ?? ''}`

  return letters.toUpperCase().slice(FIRST_INDEX, INITIALS_SIZE)
}

/** Adapts one availability member into the compact card: the whole surface opens the member's
 *  weekly schedule, showing only their identity and the declared weekly total — no per-day
 *  breakdown, that detail lives in the modal `onOpen` opens. */
export default function MemberAvailabilityCard({ member, onOpen }: Props) {
  const { t } = useT()
  const hasSchedule = member.ranges.length > 0
  const weeklyHours = declaredWeeklyHours(member.ranges)
  const totalText = hasSchedule
    ? t('tasks.availability.weekDeclared', { hours: weeklyHours })
    : t('tasks.availability.notConfigured')
  const accessibleLabel = t('tasks.availability.openSchedule', { name: member.name })

  return (
    <Pressable accessibleLabel={accessibleLabel} onClick={onOpen} className={s.card}>
      <PersonSummary
        initials={memberInitials(member.name)}
        size="lg"
        name={member.name}
        subtitle={member.team?.name}
      />
      <div className={s.total}>{totalText}</div>
    </Pressable>
  )
}

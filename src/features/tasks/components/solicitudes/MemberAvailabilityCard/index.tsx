'use client'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { Pressable } from '@/shared/components/ui'
import PersonSummary from '@/shared/components/PersonSummary'
import memberInitials from './member-initials'
import useScheduleLabel from './schedule-label'
import CardStatus from './card-status'
import s from './index.module.css'

type Props = {
  member: AvailabilityMemberDto
  onOpen: () => void
}

/** Adapts one availability member into the compact card: the whole surface opens the member's
 *  weekly schedule. Identity sits on the left; the declared-vs-expected hours badge and the
 *  pencil/eye icon — whether this card is the viewer's own editable row — sit on the right. */
export default function MemberAvailabilityCard({ member, onOpen }: Props) {
  const accessibleLabel = useScheduleLabel(member)
  const initials = memberInitials(member.name)

  return <Pressable accessibleLabel={accessibleLabel} onClick={onOpen} className={s.card}>
    <PersonSummary initials={initials} size="lg" name={member.name} subtitle={member.team?.name} />
    <CardStatus member={member} />
  </Pressable>
}

// One member's card on the weekly availability screen: identity, week status, and the way in.

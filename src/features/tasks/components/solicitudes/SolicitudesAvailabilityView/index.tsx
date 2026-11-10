'use client'
import { useEffect, useState } from 'react'
import { useT } from '@/shared/i18n'
import { ListaRotulada } from '@/shared/components/ui'
import fetchVisibleAvailability from '@/features/tasks/data/availability/fetch-visible'
import MemberAvailabilityCard from '../MemberAvailabilityCard'
import MemberAvailabilityModal from '@/features/tasks/components/modals/MemberAvailabilityModal'
import loadAvailability from './availability'
import buildScreenActions from './member-editing'
import orderMembers from './order-members'
import LoadGate from './load-gate'
import { AVAILABILITY_VIEW_COPY, AVAILABILITY_VIEW_STATUS, INITIAL_SCREEN_STATE } from './constants'
import type { ScreenState, ViewMember } from './types'
import s from './index.module.css'

export default function SolicitudesAvailabilityView() {
  const { t } = useT()
  const [screen, setScreen] = useState<ScreenState>(INITIAL_SCREEN_STATE)
  const { availability, openMemberId } = screen
  const { status, members } = availability
  const { openMember, closeMember, handleSaved } = buildScreenActions(setScreen)

  useEffect(() => { void loadAvailability(setScreen, fetchVisibleAvailability) }, [])

  const renderMemberCard = (member: ViewMember) => (
    <li key={member.id}>
      <MemberAvailabilityCard member={member} onOpen={() => openMember(member.id)} />
    </li>
  )

  const memberListLabel = t(AVAILABILITY_VIEW_COPY.membersLabel)
  const emptyLabel = t(AVAILABILITY_VIEW_COPY.noMembers)
  const isEmpty = status === AVAILABILITY_VIEW_STATUS.empty
  const listEmptyLabel = isEmpty ? emptyLabel : undefined
  const isOpenMember = (member: ViewMember) => member.id === openMemberId
  const openMemberRecord = members.find(isOpenMember) ?? null
  const orderedMembers = orderMembers(members)

  return (
    <LoadGate availability={availability}><div>
      <div className={s.head}>
        <div className={s.title}>{t(AVAILABILITY_VIEW_COPY.title)}</div>
        <div className={s.sub}>{t(AVAILABILITY_VIEW_COPY.sub)}</div>
      </div>
      <ListaRotulada label={memberListLabel} className={s.grid} emptyLabel={listEmptyLabel}>
        {orderedMembers.map(renderMemberCard)}
      </ListaRotulada>
      {openMemberRecord && (
        <MemberAvailabilityModal
          member={openMemberRecord}
          onClose={closeMember}
          onSaved={handleSaved}
        />
      )}
    </div></LoadGate>
  )
}

// The weekly availability screen of Tasks › Requests: loads the visible members once, lists
// their cards, and opens one member's schedule in a modal.

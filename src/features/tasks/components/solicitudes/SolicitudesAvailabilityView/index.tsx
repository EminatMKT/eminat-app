'use client'
import { useEffect, useState } from 'react'
import { useT } from '@/shared/i18n'
import { ErrorList, ListaRotulada, LoadingView } from '@/shared/components/ui'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import fetchVisibleAvailability from '@/features/tasks/data/availability/fetch-visible'
import MemberAvailabilityCard from '../MemberAvailabilityCard'
import MemberAvailabilityModal from '@/features/tasks/components/modals/MemberAvailabilityModal'
import loadAvailability from './availability'
import buildScreenActions from './member-editing'
import { AVAILABILITY_VIEW_STATUS, INITIAL_SCREEN_STATE } from './constants'
import type { ScreenState } from './types'
import s from './index.module.css'

export default function SolicitudesAvailabilityView() {
  const { t } = useT()
  const [screen, setScreen] = useState<ScreenState>(INITIAL_SCREEN_STATE)
  const { availability, openMemberId } = screen
  const { status, members, error } = availability
  const { openMember, closeMember, handleSaved } = buildScreenActions(setScreen)

  useEffect(() => { void loadAvailability(setScreen, fetchVisibleAvailability) }, [])

  const renderMemberCard = (member: AvailabilityMemberDto) => (
    <li key={member.id}>
      <MemberAvailabilityCard member={member} onOpen={() => openMember(member.id)} />
    </li>
  )

  if (status === AVAILABILITY_VIEW_STATUS.loading) return <LoadingView />

  if (status === AVAILABILITY_VIEW_STATUS.error) return <ErrorList errores={[error]} />

  const memberListLabel = t('tasks.availability.membersLabel')
  const emptyLabel = t('tasks.availability.noMembers')
  const isEmpty = status === AVAILABILITY_VIEW_STATUS.empty
  const listEmptyLabel = isEmpty ? emptyLabel : undefined
  const isOpenMember = (member: AvailabilityMemberDto) => member.id === openMemberId
  const openMemberRecord = members.find(isOpenMember) ?? null

  return (
    <div>
      <div className={s.head}>
        <div className={s.title}>{t('tasks.availability.title')}</div>
        <div className={s.sub}>{t('tasks.availability.sub')}</div>
      </div>
      <ListaRotulada label={memberListLabel} className={s.grid} emptyLabel={listEmptyLabel}>
        {members.map(renderMemberCard)}
      </ListaRotulada>
      {openMemberRecord && (
        <MemberAvailabilityModal
          member={openMemberRecord}
          onClose={closeMember}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

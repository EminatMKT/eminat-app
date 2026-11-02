'use client'
import { useEffect, useState } from 'react'
import { useT } from '@/shared/i18n'
import {
  ErrorList,
  ListaRotulada,
  LoadingView,
} from '@/shared/components/ui'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import fetchVisibleAvailability from '@/features/tasks/data/availability/fetch-visible'
import MemberAvailabilityCard from '../MemberAvailabilityCard'
import WeeklyAvailabilityEditor from '../WeeklyAvailabilityEditor'
import loadAvailability from './availability'
import buildScreenActions from './member-editing'
import {
  AVAILABILITY_VIEW_STATUS,
  INITIAL_SCREEN_STATE,
} from './constants'
import type { ScreenState } from './types'
import s from './index.module.css'

export default function SolicitudesAvailabilityView() {
  const { t } = useT()
  const [screen, setScreen] = useState<ScreenState>(INITIAL_SCREEN_STATE)
  const { availability, editingMemberId } = screen
  const { status, members, error } = availability
  const { startEdit, cancelEdit, handleSaved } = buildScreenActions(setScreen)

  useEffect(() => {
    void loadAvailability(setScreen, fetchVisibleAvailability)
  }, [])

  const renderMemberCard = (member: AvailabilityMemberDto) => {
    const { id } = member
    const isEditing = id === editingMemberId
    const row = isEditing
      ? <WeeklyAvailabilityEditor member={member} onCancel={cancelEdit} onSaved={handleSaved} />
      : <MemberAvailabilityCard member={member} onEdit={() => startEdit(id)} />

    return <li key={id} className={isEditing ? s.editingItem : undefined}>{row}</li>
  }

  if (status === AVAILABILITY_VIEW_STATUS.loading) return <LoadingView />

  if (status === AVAILABILITY_VIEW_STATUS.error) return <ErrorList errores={[error]} />

  const memberListLabel = t('tasks.availability.membersLabel')
  const emptyLabel = t('tasks.availability.noMembers')
  const isEmpty = status === AVAILABILITY_VIEW_STATUS.empty
  const listEmptyLabel = isEmpty ? emptyLabel : undefined

  return (
    <div>
      <div className={s.head}>
        <div className={s.title}>{t('tasks.availability.title')}</div>
        <div className={s.sub}>{t('tasks.availability.sub')}</div>
      </div>
      <ListaRotulada
        label={memberListLabel}
        className={s.grid}
        emptyLabel={listEmptyLabel}
      >
        {members.map(renderMemberCard)}
      </ListaRotulada>
    </div>
  )
}

// Loads the viewer's visible members, then lets a `canEdit` row swap its card for the weekly
// availability editor and absorb a save back into the list.

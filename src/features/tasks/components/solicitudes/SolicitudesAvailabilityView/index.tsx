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
import loadAvailability from './availability'
import {
  AVAILABILITY_VIEW_STATUS,
  INITIAL_AVAILABILITY_STATE,
} from './constants'
import type { AvailabilityViewState } from './types'
import s from './index.module.css'

export default function SolicitudesAvailabilityView() {
  const { t } = useT()
  const [state, setState] = useState<AvailabilityViewState>(INITIAL_AVAILABILITY_STATE)
  const { status, members, error } = state

  useEffect(() => {
    void loadAvailability(setState, fetchVisibleAvailability)
  }, [])

  const renderMemberCard = (member: AvailabilityMemberDto) => (
    <li key={member.id}>
      <MemberAvailabilityCard member={member} />
    </li>
  )

  if (status === AVAILABILITY_VIEW_STATUS.loading) return <LoadingView />
  if (status === AVAILABILITY_VIEW_STATUS.error) return <ErrorList errores={[error]} />

  const memberListLabel = t('tasks.availability.membersLabel')
  const emptyLabel = t('tasks.availability.noMembers')
  const isEmpty = status === AVAILABILITY_VIEW_STATUS.empty
  const listEmptyLabel = isEmpty ? emptyLabel : undefined
  return (
    <div>
      <div className={s.head}>
        <div className={s.title}>{t('stratix.avail.title')}</div>
        <div className={s.sub}>{t('stratix.avail.sub')}</div>
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

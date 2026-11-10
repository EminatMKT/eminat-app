'use client'
import { Eye, Pencil } from 'lucide-react'
import WeekHours from '../week-hours'
import DeclaredTotal from '../declared-total'
import { CARD_ICON_SIZE } from '../constants'
import s from '../index.module.css'
import type { CardStatusProps } from './types'

/** The card's right side: the week badge (or the bare total without a jornada), then the pencil
 *  (own, editable) or eye (read-only). */
export default function CardStatus({ member }: CardStatusProps) {
  const WeekStatus = member.workday ? WeekHours : DeclaredTotal
  const Icon = member.canEdit ? Pencil : Eye
  const iconClass = member.canEdit ? s.pencilIcon : s.icon

  return <div className={s.meta}>
    <WeekStatus member={member} />
    <Icon aria-hidden="true" size={CARD_ICON_SIZE} className={iconClass} />
  </div>
}

// Groups what the card shows on its right: the week's hours status and whether it is editable.

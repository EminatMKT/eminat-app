'use client'
import { declaredWeeklyHours } from '@/features/tasks/utils/availability'
import { useT } from '@/shared/i18n'
import { NO_JORNADA_KEY } from '../constants'
import s from '../index.module.css'
import type { DeclaredTotalProps } from './types'

/** The declared week total, with the notice that there is no jornada to compare it against. */
export default function DeclaredTotal({ member }: DeclaredTotalProps) {
  const { t } = useT()
  const hoursVars = { hours: declaredWeeklyHours(member.ranges) }

  return <span className={s.total}>{t(NO_JORNADA_KEY, hoursVars)}</span>
}

// Stands in for the hours badge on a card whose member has no jornada: hours, nothing to compare.

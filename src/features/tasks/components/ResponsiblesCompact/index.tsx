'use client'
import { Crown } from 'lucide-react'
import { useT } from '@/shared/i18n'
import { etiquetaResponsablesCompacta, usersFromNames } from '@/features/tasks/utils/responsables'
import type { ResponsiblesInput } from '@/features/tasks/types'
import s from './index.module.css'

type Props = {
  a: ResponsiblesInput
  namesById: Record<string, string>
  className?: string
}

export default function ResponsiblesCompact({ a, namesById, className }: Props) {
  const { t } = useT()
  const { label, lider } = etiquetaResponsablesCompacta(a, usersFromNames(namesById))
  const collaborators = (a.responsables || []).filter(row => !row.es_lider)
  const names = collaborators.map(row => namesById[row.usuario_id] || row.usuario_id)
  return (
    <span className={`${s.people} ${className || ''}`} title={names.join(', ')}>
      {lider && <Crown role="img" aria-label={t('tasks.responsibles.leaderBadge')} size={12} />}
      {lider && ' '}
      {label}
      {names.slice(0, 2).map((name, index) => <span className={s.avatar} key={collaborators[index].usuario_id} aria-label={name}>{name.slice(0, 1)}</span>)}
      {names.length > 2 && <small className={s.more}>+{names.length - 2}</small>}
    </span>
  )
}

// One line for every compact task view (card, Gantt, table, recent): the leader's crown, then
// `Ana Bravo +2`. The crown inherits the text color, like the one in the form.

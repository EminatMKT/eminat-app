'use client'
import { Crown } from 'lucide-react'
import { useT } from '@/shared/i18n'
import { etiquetaResponsablesCompacta, usersFromNames } from '@/features/tasks/utils/responsables'
import type { ResponsiblesInput } from '@/features/tasks/types'

type Props = {
  a: ResponsiblesInput
  namesById: Record<string, string>
  className?: string
}

export default function ResponsiblesCompact({ a, namesById, className }: Props) {
  const { t } = useT()
  const { label, lider } = etiquetaResponsablesCompacta(a, usersFromNames(namesById))
  return (
    <span className={className}>
      {lider && <Crown role="img" aria-label={t('tasks.responsibles.leaderBadge')} size={12} />}
      {lider && ' '}
      {label}
    </span>
  )
}

// One line for every compact task view (card, Gantt, table, recent): the leader's crown, then
// `Ana Bravo +2`. The crown inherits the text color, like the one in the form.

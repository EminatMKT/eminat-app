'use client'
import { Crown } from 'lucide-react'
import { Pressable } from '@/shared/components/ui'
import { useT, type I18nKey } from '@/shared/i18n'
import s from './index.module.css'

type Props = {
  name: string
  leads: boolean
  onCrown: () => void
}

const CROWN_SIZE = 16
const ACTION_KEY: Record<'leads' | 'follows', I18nKey> = {
  leads: 'tasks.responsibles.removeLeaderAria',
  follows: 'tasks.responsibles.makeLeaderAria',
}
const LEADER_TEXT: I18nKey = 'tasks.responsibles.leaderText'

/** The crown of one chosen responsible: pressing it toggles who leads the task. */
export default function LeaderCrown({ name, leads, onCrown }: Props) {
  const { t } = useT()
  const actionKey = leads ? ACTION_KEY.leads : ACTION_KEY.follows
  const leaderAria = { name }
  return (
    <Pressable accessibleLabel={t(actionKey, leaderAria)} className={s.action} pressed={leads} onClick={onCrown}>
      <Crown aria-hidden size={CROWN_SIZE} />
      {leads && <span className={s.badge}>{t(LEADER_TEXT)}</span>}
    </Pressable>
  )
}

// The action slot of a responsables option. Only a checked person gets it, because leadership is
// exclusive and only a responsible can hold it. The aria label names the person and says what
// pressing does; the text badge says who leads without relying on the pressed style alone.

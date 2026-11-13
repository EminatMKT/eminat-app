import { useT } from '@/shared/i18n'
import { LEADER_KEY } from '../constants'
import s from '../index.module.css'

/** The corner badge that marks the marketing team leader's card. */
export default function RosterLeaderBadge() {
  const { t } = useT()

  return <span className={s.badge}>{t(LEADER_KEY)}</span>
}

// RosterCard mounts it only for the leader; the label is translated, the styling is the card's.

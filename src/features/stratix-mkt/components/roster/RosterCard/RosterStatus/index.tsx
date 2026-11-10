import { useT } from '@/shared/i18n'
import {
  ACCOUNT_PENDING_KEY,
  ACTIVE_NOW_KEY,
  NO_TEXT,
  OFFLINE_KEY,
} from '../constants'
import type { Presence } from '../types'
import s from '../index.module.css'

type Props = {
  presence: Presence
}

export default function RosterStatus({ presence }: Props) {
  const { t } = useT()

  if (!presence.hasAccount) return <span className={s.aviso}>{t(ACCOUNT_PENDING_KEY)}</span>

  const statusClass = `${s.estado} ${presence.isOnline ? s.online : NO_TEXT}`
  const label = presence.isOnline ? `● ${t(ACTIVE_NOW_KEY)}` : t(OFFLINE_KEY)

  return <span className={statusClass}>{label}</span>
}

// The footer status: a member without an account gets the account notice; one with an account
// reads "active now" (with a dot, highlighted) while their heartbeat is fresh, "offline" if not.

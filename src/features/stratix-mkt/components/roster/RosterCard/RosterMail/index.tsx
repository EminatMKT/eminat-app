import { useT } from '@/shared/i18n'
import { MISSING_EMAIL, NO_ACCOUNT_KEY } from '../constants'
import type { Presence } from '../types'
import s from '../index.module.css'

type Props = {
  email?: string
  presence: Presence
}

export default function RosterMail({ email, presence }: Props) {
  const { t } = useT()
  const text = presence.hasAccount ? `✉ ${email ?? MISSING_EMAIL}` : `✉ — ${t(NO_ACCOUNT_KEY)}`

  return <div className={s.mail}>{text}</div>
}

// The email line of the roster card; a member without an account reads "no account yet" instead.

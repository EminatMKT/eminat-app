import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { IN_PROGRESS_KEY } from '../constants'
import inProgressCount from '../in-progress-count'
import s from '../index.module.css'

type Props = {
  userId: string
}

export default function RosterWorkload({ userId }: Props) {
  const { actividades } = useApp()
  const { t } = useT()
  const count = inProgressCount(actividades, userId)
  const countVars = { n: count }

  if (count === 0) return null

  return <span className={s.carga}>{t(IN_PROGRESS_KEY, countVars)}</span>
}

// How many activities the member is responsible for that are in progress; nothing when zero.

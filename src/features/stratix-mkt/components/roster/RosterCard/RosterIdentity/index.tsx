import Avatar from '@/shared/components/Avatar'
import { getIniciales } from '@/shared/constants/domain'
import RosterName from '../RosterName'
import { NO_TEXT } from '../constants'
import type { AvatarStatus, RosterUser } from '../types'
import s from '../index.module.css'

type Props = {
  user: RosterUser
  status: AvatarStatus
}

export default function RosterIdentity({ user, status }: Props) {
  const fullName = `${user.nombre || NO_TEXT} ${user.apellido || NO_TEXT}`.trim()
  const avatar = { initials: getIniciales(fullName), color: user.color, status }

  return <div className={s.head}>
    <Avatar {...avatar} size="xl" className={s.avatarWrap} />
    <RosterName user={user} fullName={fullName} />
  </div>
}

// The card header: the shared Avatar (initials, member color, presence dot) next to the name
// column. The full name is computed once here and handed to both.

import RosterMail from '../RosterMail'
import RosterStatus from '../RosterStatus'
import RosterWorkload from '../RosterWorkload'
import type { Presence, RosterUser } from '../types'
import s from '../index.module.css'

type Props = {
  user: RosterUser
  presence: Presence
}

export default function RosterDetails({ user, presence }: Props) {
  return <>
    <RosterMail email={user.email} presence={presence} />
    <div className={s.pie}>
      <RosterStatus presence={presence} />
      <RosterWorkload userId={user.id} />
    </div>
  </>
}

// The lower half of the roster card: the email line, then the footer with presence and workload.

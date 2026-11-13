import LIST_SEPARATOR from '@/shared/constants/list-separator'
import { NO_TEXT } from '../constants'
import type { RosterUser } from '../types'
import s from '../index.module.css'

type Props = {
  user: RosterUser
  fullName: string
}

export default function RosterName({ user, fullName }: Props) {
  const names = (user.usuario_cargos || []).map(link => link.cargos?.nombre)
  const positions = names.filter((name): name is string => (name ?? NO_TEXT) !== NO_TEXT)

  return <div className={s.datos}>
    <div className={s.nombre}>{fullName}</div>
    <div className={s.cargo}>{positions.join(LIST_SEPARATOR)}</div>
  </div>
}

// The name column beside the roster avatar: the member's full name over their positions, joined
// into one line. A position without a name (no embed, or a blank one) is skipped.

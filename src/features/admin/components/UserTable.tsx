'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT, type I18nKey } from '@/shared/i18n'
import UserRow from './UserRow'
import type { AdminUser, ResetTarget } from '../types'

type Props = {
  users: AdminUser[]
  onEdit: (u: AdminUser) => void
  onReset: (t: ResetTarget) => void
  onDelete: (id: string) => void
}

// Jornada y vinculación salen del subtítulo del nombre y pasan a columna propia:
// son datos que se escanean/comparan entre filas, no adorno del nombre.
const HEADERS: I18nKey[] = [
  'common.user', 'common.email', 'admin.cargosTitle', 'common.company',
  'common.jornada', 'common.vinculacion', 'admin.colAccess', 'admin.colStatus', 'admin.colActions',
]

export default function UserTable({ users, onEdit, onReset, onDelete }: Props) {
  const { s1, s2, border, t3 } = useApp()
  const { t } = useT()
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: s2 }}>
            {HEADERS.map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{t(h)}</th>)}
          </tr></thead>
          <tbody>{users.map(u => <UserRow key={u.id} user={u} onEdit={onEdit} onReset={onReset} onDelete={onDelete} />)}</tbody>
        </table>
      </div>
    </div>
  )
}

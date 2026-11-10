'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import Avatar from '@/shared/components/Avatar'
import type { Usuario } from '@/shared/context/loadAppData'
import { ONLINE_WINDOW_MS } from './constants'
import s from './index.module.css'

// Campos canónicos de `Usuario` (Pick) + el embed N:N `usuario_cargos`.
type TeamUser = Pick<Usuario, 'nombre' | 'apellido' | 'color'> & {
  usuario_cargos?: { cargos?: { codigo: string; nombre: string } | null }[]
}

type Props = {
  u: TeamUser
}

export default function TeamOnlineRow({ u }: Props) {
  const { usuarios } = useApp()
  const { t } = useT()
  const userInfo = usuarios.find(us => us.nombre === u.nombre)
  const isOnline = userInfo?.online_at ? new Date(userInfo.online_at) > new Date(Date.now() - ONLINE_WINDOW_MS) : false
  return (
    <div className={s.row}>
      <Avatar
        initials={`${u.nombre?.[0] ?? ''}${u.apellido?.[0] ?? ''}`}
        size="md"
        color={u.color}
        status={isOnline ? 'online' : 'offline'}
        className={s.avatarWrap}
      />
      <div>
        <div className={s.name}>{u.nombre}</div>
        <div className={`${s.status} ${isOnline ? s.on : ''}`}>{isOnline ? t('stratix.dash.activeNow') : t('stratix.dash.offline')}</div>
      </div>
    </div>
  )
}

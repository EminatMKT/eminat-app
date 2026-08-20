'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import type { Usuario } from '@/shared/context/loadAppData'
import s from './index.module.css'

// Campos canónicos de `Usuario` (Pick) + el embed N:N `usuario_cargos`.
type TeamUser = Pick<Usuario, 'nombre' | 'apellido' | 'color'> & {
  usuario_cargos?: { cargos?: { codigo: string; nombre: string } | null }[]
}

// Se considera en línea si marcó presencia en los últimos 5 minutos.
const ONLINE_WINDOW_MS = 5 * 60 * 1000

export default function TeamOnlineRow({ u }: { u: TeamUser }) {
  const { usuarios } = useApp()
  const { t } = useT()
  const userInfo = usuarios.find(us => us.nombre === u.nombre)
  const isOnline = userInfo?.online_at ? new Date(userInfo.online_at) > new Date(Date.now() - ONLINE_WINDOW_MS) : false
  return (
    <div className={s.row}>
      <div className={s.avatarWrap}>
        <div className={s.avatar} style={{ '--color': u.color } as CSSProperties}>{u.nombre?.[0]}{u.apellido?.[0]}</div>
        <div className={`${s.dot} ${isOnline ? s.on : ''}`} />
      </div>
      <div>
        <div className={s.name}>{u.nombre}</div>
        <div className={`${s.status} ${isOnline ? s.on : ''}`}>{isOnline ? t('stratix.dash.activeNow') : t('stratix.dash.offline')}</div>
      </div>
    </div>
  )
}

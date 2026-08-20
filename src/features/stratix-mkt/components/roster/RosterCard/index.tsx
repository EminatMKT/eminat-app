'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { ESTADO } from '@/shared/constants/domain'
import type { Usuario } from '@/shared/context/loadAppData'
import s from './index.module.css'

interface UsuarioCargo { cargos?: { codigo: string; nombre: string } | null }
// Campos canónicos de `Usuario` (Pick) + `auth_id` y el embed N:N `usuario_cargos`,
// que no viven en la fila canónica.
type RosterUser = Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'email' | 'online_at' | 'color'> & {
  auth_id?: string | null
  usuario_cargos?: UsuarioCargo[]
}

// Se considera en línea si marcó presencia en los últimos 5 minutos.
const ONLINE_WINDOW_MS = 5 * 60 * 1000

type Props = {
  user: RosterUser
  esLider: boolean
}

export default function RosterCard({ user, esLider }: Props) {
  const { actividades } = useApp()
  const { t } = useT()
  const nombreCompleto = `${user.nombre || ''} ${user.apellido || ''}`.trim()
  const iniciales = nombreCompleto.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
  const tieneCuenta = !!user.auth_id
  const isOnline = user.online_at ? new Date(user.online_at) > new Date(Date.now() - ONLINE_WINDOW_MS) : false
  const enProceso = actividades.filter(a => a.responsable_id === user.id && a.estado === ESTADO.EN_PROCESO).length
  const cargo = (user.usuario_cargos || []).map(uc => uc.cargos?.nombre).filter(Boolean).join(', ')

  return (
    <div className={`${s.card} ${esLider ? s.lider : ''} ${tieneCuenta ? '' : s.sinCuenta}`}
      style={{ '--swatch': user.color } as CSSProperties}>
      {esLider && <span className={s.badge}>{t('stratix.team.leader')}</span>}
      <div className={s.head}>
        <div className={s.avatarWrap}>
          <div className={s.avatar}>{iniciales}</div>
          <div className={`${s.dot} ${tieneCuenta ? s.conCuenta : ''} ${tieneCuenta && isOnline ? s.online : ''}`} />
        </div>
        <div className={s.datos}>
          <div className={s.nombre}>{nombreCompleto}</div>
          <div className={s.cargo}>{cargo}</div>
        </div>
      </div>
      <div className={s.mail}>{tieneCuenta ? `✉ ${user.email}` : `✉ — ${t('stratix.team.noAccountYet')}`}</div>
      <div className={s.pie}>
        {tieneCuenta ? (
          <span className={`${s.estado} ${isOnline ? s.online : ''}`}>
            {isOnline ? `● ${t('stratix.team.activeNow')}` : t('stratix.team.offline')}
          </span>
        ) : (
          <span className={s.aviso}>{t('stratix.team.accountPending')}</span>
        )}
        {enProceso > 0 && <span className={s.carga}>{t('stratix.team.inProgress', { n: enProceso })}</span>}
      </div>
    </div>
  )
}

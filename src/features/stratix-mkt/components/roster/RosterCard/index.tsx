'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { ESTADO } from '@/shared/constants/domain'
import Avatar from '@/shared/components/Avatar'
import { esResponsable } from '@/features/tasks/utils/responsables'
import type { Props } from './types'
import s from './index.module.css'

// Se considera en línea si marcó presencia en los últimos 5 minutos.
const ONLINE_WINDOW_MS = 5 * 60 * 1000

export default function RosterCard({ user, esLider }: Props) {
  const { actividades } = useApp()
  const { t } = useT()
  const nombreCompleto = `${user.nombre || ''} ${user.apellido || ''}`.trim()
  const iniciales = nombreCompleto.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
  const tieneCuenta = !!user.auth_id
  const isOnline = user.online_at ? new Date(user.online_at) > new Date(Date.now() - ONLINE_WINDOW_MS) : false
  const enProceso = actividades.filter(a => esResponsable(a, user.id) && a.estado === ESTADO.EN_PROCESO).length
  const cargo = (user.usuario_cargos || []).map(uc => uc.cargos?.nombre).filter(Boolean).join(', ')
  let avatarStatus: 'unregistered' | 'online' | 'offline' = 'offline'

  if (!tieneCuenta) avatarStatus = 'unregistered'
  else if (isOnline) avatarStatus = 'online'

  return (
    <div className={`${s.card} ${esLider ? s.lider : ''} ${tieneCuenta ? '' : s.sinCuenta}`}>
      {esLider && <span className={s.badge}>{t('stratix.team.leader')}</span>}
      <div className={s.head}>
        <Avatar
          initials={iniciales}
          size="xl"
          color={user.color}
          status={avatarStatus}
          className={s.avatarWrap}
        />
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

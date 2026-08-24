'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { ESTADO } from '@/shared/constants/domain'
import { cargaDe, slotOcupado, HORAS_SEMANALES } from '@/features/stratix-mkt/utils/availability'
import HourSlot from '../HourSlot'
import ActiveTaskLine from '../ActiveTaskLine'
import s from './index.module.css'

const SLOTS = [9, 10, 11, 12, 13, 14, 15, 16, 17]
const ONLINE_WINDOW_MS = 5 * 60 * 1000
const MAX_TAREAS_VISIBLES = 2

type Props = {
  userId: string
  nombre: string
}

export default function MemberAvailabilityCard({ userId, nombre }: Props) {
  const { usuarios, actividades } = useApp()
  const { t } = useT()
  const activas = actividades.filter(a => a.responsable_id === userId
    && (a.estado === ESTADO.EN_PROCESO || a.estado === ESTADO.PENDIENTE))
  const { horasOcupadas, horasLibres, pctOcupado, disponible } = cargaDe(activas)
  const userInfo = usuarios.find(u => u.id === userId)
  const isOnline = userInfo?.online_at ? new Date(userInfo.online_at) > new Date(Date.now() - ONLINE_WINDOW_MS) : false

  return (
    <div className={`${s.card} ${disponible ? '' : s.ocupada}`}
      style={{ '--swatch': userInfo?.color, '--pct': `${pctOcupado}%` } as CSSProperties}>
      <div className={s.head}>
        <div className={s.persona}>
          <div className={s.avatarWrap}>
            <div className={s.avatar}>{nombre[0]}</div>
            <div className={`${s.dot} ${isOnline ? s.online : ''}`} />
          </div>
          <div>
            <div className={s.nombre}>{nombre}</div>
            <div className={s.resumen}>{t('stratix.avail.tasks', { n: activas.length, h: horasOcupadas })}</div>
          </div>
        </div>
        <span className={s.estado}>{disponible ? `✓ ${t('stratix.avail.free')}` : `✕ ${t('stratix.avail.busy')}`}</span>
      </div>

      <div className={s.capacidad}>
        <div className={s.capHead}>
          <span>{t('stratix.avail.capacity', { h: HORAS_SEMANALES })}</span>
          <span className={s.libres}>{t('stratix.avail.hoursFree', { h: horasLibres })}</span>
        </div>
        <div className={s.track}><div className={s.fill} /></div>
        <div className={s.usado}>{t('stratix.avail.used', { n: Math.round(pctOcupado) })}</div>
      </div>

      <div>
        <div className={s.rotulo}>{t('stratix.avail.schedule')}</div>
        <div className={s.slots}>
          {SLOTS.map(h => <HourSlot key={h} hora={h} ocupado={slotOcupado(pctOcupado, h)} />)}
        </div>
      </div>

      {activas.length > 0 && (
        <div className={s.enCurso}>
          <div className={s.enCursoTitulo}>{t('stratix.avail.inProgress')}</div>
          {activas.slice(0, MAX_TAREAS_VISIBLES).map(a => (
            <ActiveTaskLine key={a.id} empresa={a.empresa} titulo={a.titulo} />
          ))}
          {activas.length > MAX_TAREAS_VISIBLES && (
            <div className={s.mas}>{t('stratix.avail.more', { n: activas.length - MAX_TAREAS_VISIBLES })}</div>
          )}
        </div>
      )}
    </div>
  )
}

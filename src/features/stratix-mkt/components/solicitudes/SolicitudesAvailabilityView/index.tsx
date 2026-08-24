'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import MemberAvailabilityCard from '../MemberAvailabilityCard'
import s from './index.module.css'

export default function SolicitudesAvailabilityView() {
  const { miembrosAsignables } = useApp()
  const { t } = useT()
  return (
    <div>
      <div className={s.head}>
        <div className={s.title}>{t('stratix.avail.title')}</div>
        <div className={s.sub}>{t('stratix.avail.sub')}</div>
      </div>
      <div className={s.grid}>
        {miembrosAsignables.map(m => <MemberAvailabilityCard key={m.id} userId={m.id} nombre={m.nombre} />)}
      </div>
    </div>
  )
}

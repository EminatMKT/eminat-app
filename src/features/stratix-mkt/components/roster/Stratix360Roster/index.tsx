'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import RosterCard from '../RosterCard'
import s from './index.module.css'

export default function Stratix360Roster() {
  const { equipoMarketing } = useApp()
  const { t } = useT()
  const liderId = equipoMarketing.find(u => u.equipos?.lider_id)?.equipos?.lider_id ?? null
  return (
    <div>
      <div className={s.chip}>{t('stratix.team.title')}</div>
      <div className={s.grid}>
        {equipoMarketing.map(u => <RosterCard key={u.id} user={u} esLider={u.id === liderId} />)}
      </div>
    </div>
  )
}

'use client'
import { useApp, MESES } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import HoursSummaryCard from '../HoursSummaryCard'
import s from './index.module.css'

export default function HorasTab() {
  const { esAdmin } = useApp()
  const { t } = useT()
  const { mesHoras, setMesHoras, resumenHoras } = useStratix()
  return (
    <div>
      <div className={s.bar}>
        <span className={s.title}>{t(esAdmin ? 'stratix.hours.teamSummary' : 'stratix.hours.yours')}</span>
        <select className={s.select} value={mesHoras} onChange={e => setMesHoras(e.target.value)}>
          <option value="">{t('stratix.allMonths')}</option>
          {MESES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className={s.lista}>
        {resumenHoras.map(r => <HoursSummaryCard key={r.id} r={r} />)}
      </div>
    </div>
  )
}

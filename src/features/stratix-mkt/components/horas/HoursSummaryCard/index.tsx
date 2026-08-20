'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import type { ResumenHoras } from '@/features/stratix-mkt/types'
import HoursStat from '../HoursStat'
import s from './index.module.css'

export default function HoursSummaryCard({ r }: { r: ResumenHoras }) {
  const { accent, t1 } = useApp()
  const { t } = useT()
  const pct = r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0
  const stats = [
    { label: t('stratix.hours.totalTasks'), value: r.total, color: t1 },
    { label: t('stratix.hours.completed'), value: r.completadas, color: '#34D399' },
    { label: t('stratix.hours.rate'), value: `${pct}%`, color: accent },
  ]
  return (
    <div className={s.card}>
      <div className={s.head}>
        <div className={s.nombre}>{r.nombre}</div>
        <div className={s.total}>
          <div className={s.horas}>{r.horas}h</div>
          <div className={s.dias}>{t('stratix.hours.prodDays', { n: r.dias })}</div>
        </div>
      </div>
      <div className={s.stats}>
        {stats.map(st => <HoursStat key={st.label} label={st.label} value={st.value} color={st.color} />)}
      </div>
      <div className={s.track}>
        <div className={s.fill} style={{ '--pct': `${pct}%` } as CSSProperties} />
      </div>
    </div>
  )
}

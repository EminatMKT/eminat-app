'use client'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import PillToggle from '@/shared/components/ui/PillToggle'
import GanttChart from '../GanttChart'
import s from './index.module.css'

const GANTT_VISTAS = ['Week', 'Month', 'Q1', 'Q2', 'Q3', 'Q4']

export default function GanttTab() {
  const { t } = useT()
  const { ganttVista, setGanttVista } = useStratix()
  return (
    <div>
      <div className={s.bar}>
        <div>
          <span className={s.title}>{t('stratix.gantt.title')}</span>
          <span className={s.sub}>{t('stratix.gantt.sub')}</span>
        </div>
        <div className={s.views}>
          {GANTT_VISTAS.map(v => (
            <PillToggle key={v} label={v} size="sm" active={ganttVista === v} onClick={() => setGanttVista(v)} />
          ))}
        </div>
      </div>
      <GanttChart />
    </div>
  )
}

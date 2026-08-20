'use client'
import { ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import DayHeader from '../DayHeader'
import EstadoLeyendaItem from '../EstadoLeyendaItem'
import GanttBar from '../GanttBar'
import s from './index.module.css'

const DIA_MS = 86400000
const MAX_DIAS = 31
const MIN_DIAS = 7
const MAX_BARRAS = 40

export default function GanttChart() {
  const { t } = useT()
  const { getGanttActs, hoy } = useStratix()

  const actsGantt = getGanttActs()
  const fechas = actsGantt.map(a => new Date(a.fecha_entrega)).sort((a, b) => a.getTime() - b.getTime())
  const fechaMin = fechas[0] || hoy
  const fechaMax = fechas[fechas.length - 1] || new Date(hoy.getTime() + 30 * DIA_MS)
  const totalDias = Math.max(Math.ceil((fechaMax.getTime() - fechaMin.getTime()) / DIA_MS) + 1, MIN_DIAS)
  const dias = Array.from({ length: Math.min(totalDias, MAX_DIAS) }, (_, i) => new Date(fechaMin.getTime() + i * DIA_MS))

  return (
    <div className={s.chart}>
      <div className={s.head}>
        <div className={s.headLabel}>{t('stratix.gantt.taskAssignee')}</div>
        <div className={s.dias}>
          {dias.map((d, i) => <DayHeader key={i} d={d} hoy={hoy} />)}
        </div>
      </div>
      <div className={s.filas}>
        {actsGantt.slice(0, MAX_BARRAS).map(a => <GanttBar key={a.id} a={a} fechaMin={fechaMin} />)}
        {actsGantt.length === 0 && <div className={s.vacio}>{t('stratix.gantt.empty')}</div>}
      </div>
      <div className={s.leyenda}>
        {Object.entries(ESTADO_COLORS).map(([estado, color]) => (
          <EstadoLeyendaItem key={estado} label={estadoLabel(estado, t)} color={color} />
        ))}
        <EstadoLeyendaItem label={t('stratix.gantt.weekend')} finde />
      </div>
    </div>
  )
}

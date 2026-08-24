'use client'
import { useEffect, useRef } from 'react'
import { ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import { DIA_W } from '@/features/stratix-mkt/utils/gantt-layout'
import { rangoGantt } from '@/features/stratix-mkt/utils/gantt-rango'
import DayHeader from '../DayHeader'
import EstadoLeyendaItem from '../EstadoLeyendaItem'
import GanttBar from '../GanttBar'
import s from './index.module.css'

const DIA_MS = 86400000
const MAX_BARRAS = 40

export default function GanttChart() {
  const { t } = useT()
  const { ganttActs: actsGantt, hoy } = useStratix()
  const scroller = useRef<HTMLDivElement>(null)
  const { fechaMin, totalDias, descartadas } = rangoGantt(actsGantt.map(a => a.fecha_entrega), hoy)
  const dias = Array.from({ length: totalDias }, (_, i) => new Date(fechaMin.getTime() + i * DIA_MS))

  // Abre mostrando HOY y no el principio del rango: con el filtro en "General" el rango es todo
  // el año, y arrancar en enero deja el tablero pareciendo vacío. Se corre un par de días antes
  // para que se vea de dónde viene lo que está en curso.
  const offsetHoy = Math.max(Math.floor((hoy.getTime() - fechaMin.getTime()) / DIA_MS) - 2, 0)
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = offsetHoy * DIA_W
  }, [offsetHoy])

  return (
    <div className={s.chart}>
      {descartadas > 0 && (
        <div className={s.aviso}>{t('stratix.gantt.fueraDeRango', { n: descartadas })}</div>
      )}
      <div className={s.scroller} ref={scroller}>
        <div className={s.head}>
          <div className={s.headLabel}>{t('stratix.gantt.taskAssignee')}</div>
          <div className={s.dias}>
            {dias.map((d, i) => <DayHeader key={i} d={d} hoy={hoy} />)}
          </div>
        </div>
        <div className={s.filas}>
          {actsGantt.slice(0, MAX_BARRAS).map(a => (
            <GanttBar key={a.id} a={a} fechaMin={fechaMin} dias={totalDias} />
          ))}
        </div>
      </div>
      {actsGantt.length === 0 && <div className={s.vacio}>{t('stratix.gantt.empty')}</div>}
      <div className={s.leyenda}>
        {Object.entries(ESTADO_COLORS).map(([estado, color]) => (
          <EstadoLeyendaItem key={estado} label={estadoLabel(estado, t)} color={color} />
        ))}
        <EstadoLeyendaItem label={t('stratix.gantt.weekend')} finde />
      </div>
    </div>
  )
}

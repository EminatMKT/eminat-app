'use client'
import { useEffect, useRef } from 'react'
import { ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import { DIA_W } from '@/features/stratix-mkt/utils/gantt-layout'
import DayHeader from '../DayHeader'
import EstadoLeyendaItem from '../EstadoLeyendaItem'
import GanttBar from '../GanttBar'
import s from './index.module.css'

const DIA_MS = 86400000
const MIN_DIAS = 7
const MAX_BARRAS = 40

export default function GanttChart() {
  const { t } = useT()
  const { ganttActs: actsGantt, hoy } = useStratix()
  const scroller = useRef<HTMLDivElement>(null)
  const fechas = actsGantt.map(a => new Date(a.fecha_entrega)).sort((a, b) => a.getTime() - b.getTime())
  const fechaMin = fechas[0] || hoy
  const fechaMax = fechas[fechas.length - 1] || new Date(hoy.getTime() + 30 * DIA_MS)
  // El rango sale de los datos filtrados: con el trimestre en "General" son todos los meses con
  // entrega, y el Gantt scrollea. Antes se cortaba a 31 días desde el primero y las tareas de
  // más adelante quedaban sin barra — invisible, porque la fila igual se dibujaba.
  const totalDias = Math.max(Math.ceil((fechaMax.getTime() - fechaMin.getTime()) / DIA_MS) + 1, MIN_DIAS)
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

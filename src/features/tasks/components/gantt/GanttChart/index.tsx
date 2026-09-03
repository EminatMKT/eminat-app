'use client'
import { useEffect, useRef } from 'react'
import { ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { useTasks } from '@/features/tasks/components/TasksContext'
import { DIA_W } from '@/features/tasks/utils/gantt-layout'
import { rangoGantt, fechaEnRango, rangoAnios } from '@/features/tasks/utils/gantt-rango'
import DayHeader from '../DayHeader'
import EstadoLeyendaItem from '../EstadoLeyendaItem'
import GanttBar from '../GanttBar'
import WarningCallout from '@/shared/components/ui/WarningCallout'
import TaskTable from '@/features/tasks/components/TaskTable'
import s from './index.module.css'

const DIA_MS = 86400000
const MAX_BARRAS = 40

export default function GanttChart() {
  const { t } = useT()
  const { ganttActs: actsGantt, hoy } = useTasks()
  const scroller = useRef<HTMLDivElement>(null)
  // Una sola partición: lo que entra al eje es lo que dibuja fila. Antes el aviso contaba
  // las descartadas pero el `.map()` de abajo recorría `actsGantt` entero, así que esas
  // tareas seguían ocupando fila —vacía— y encima gastaban lugares de MAX_BARRAS.
  const dentro = actsGantt.filter(a => fechaEnRango(a.fecha_entrega, hoy))
  const fuera = actsGantt.filter(a => !fechaEnRango(a.fecha_entrega, hoy))
  const { fechaMin, totalDias } = rangoGantt(dentro.map(a => a.fecha_entrega), hoy)
  const anios = rangoAnios(hoy)
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
      {/* El aviso es compartido; lo del dominio —qué se cuenta y qué tabla se lista— se le
          pasa por props. Cada fila de TaskTable ya abre el modal de detalle, que es donde se
          corrige la fecha. */}
      {fuera.length > 0 && (
        <div className={s.aviso}>
          <WarningCallout message={t('stratix.gantt.fueraDeRango', { n: fuera.length, min: anios.min, max: anios.max })}>
            <TaskTable acts={fuera} />
          </WarningCallout>
        </div>
      )}
      <div className={s.scroller} ref={scroller}>
        <div className={s.head}>
          <div className={s.headLabel}>{t('stratix.gantt.taskAssignee')}</div>
          <div className={s.dias}>
            {dias.map((d, i) => <DayHeader key={i} d={d} hoy={hoy} />)}
          </div>
        </div>
        <div className={s.filas}>
          {dentro.slice(0, MAX_BARRAS).map(a => (
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

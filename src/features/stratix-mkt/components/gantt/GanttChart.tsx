'use client'
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import DayHeader from './DayHeader'
import GanttBar from './GanttBar'

export default function GanttChart() {
  const { s1, border, t3 } = useApp()
  const { getGanttActs, hoy } = useStratix()

  const actsGantt = getGanttActs()
  const fechas = actsGantt.map(a => new Date(a.fecha_entrega)).sort((a, b) => a.getTime() - b.getTime())
  const fechaMin = fechas[0] || hoy
  const fechaMax = fechas[fechas.length - 1] || new Date(hoy.getTime() + 30 * 86400000)
  const totalDiasGantt = Math.max(Math.ceil((fechaMax.getTime() - fechaMin.getTime()) / 86400000) + 1, 7)
  const diasMostrar = Math.min(totalDiasGantt, 31)

  const dias = Array.from({ length: diasMostrar }).map((_, i) => new Date(fechaMin.getTime() + i * 86400000))
  const barras = actsGantt.slice(0, 40)
  const leyenda = Object.entries(ESTADO_COLORS)

  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${border}` }}>
        <div style={{ width: 220, flexShrink: 0, padding: '10px 14px', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderRight: `1px solid ${border}` }}>Task / Assignee</div>
        <div style={{ flex: 1, display: 'flex', overflowX: 'auto' }}>
          {dias.map((d, i) => (
            <DayHeader key={i} d={d} hoy={hoy} />
          ))}
        </div>
      </div>
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {barras.map(a => (
          <GanttBar key={a.id} a={a} fechaMin={fechaMin} />
        ))}
        {actsGantt.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>No tasks with a due date for this view</div>}
      </div>
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${border}`, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {leyenda.map(([estado, color]) => (
          <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: t3 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: `${color}30`, border: `1.5px solid ${color}` }} />
            {estado}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#F87171' }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(248,113,113,0.1)', border: '1px solid #F87171' }} />
          Weekend
        </div>
      </div>
    </div>
  )
}

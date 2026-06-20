'use client'
import { useApp } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import GanttChart from './GanttChart'

const GANTT_VISTAS = ['Week', 'Month', 'Q1', 'Q2', 'Q3', 'Q4']

export default function GanttTab() {
  const { accent, border, t1, t2, t3 } = useApp()
  const { ganttVista, setGanttVista } = useStratix()
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Gantt Chart</span>
          <span style={{ fontSize: 11, color: t3, marginLeft: 8 }}>View by due dates</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {GANTT_VISTAS.map(v => (
            <button key={v} onClick={() => setGanttVista(v)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${ganttVista === v ? accent : border}`, background: ganttVista === v ? accent : 'transparent', color: ganttVista === v ? 'white' : t2, cursor: 'pointer' }}>{v}</button>
          ))}
        </div>
      </div>
      <GanttChart />
    </div>
  )
}

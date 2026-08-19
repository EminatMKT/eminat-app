'use client'
import { useApp, COLUMNAS_KANBAN } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import KanbanColumn from './KanbanColumn'

export default function KanbanTab() {
  const { t3, inputStyle } = useApp()
  const { mesKanban, setMesKanban, mesesDisponibles, actsKanban } = useStratix()
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: t3 }}>{actsKanban.length} tasks · Drag cards to change their status</div>
        <select value={mesKanban} onChange={e => setMesKanban(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
          <option value="">All months</option>
          {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'start' }}>
        {COLUMNAS_KANBAN.map(col => (
          <KanbanColumn key={col} col={col} />
        ))}
      </div>
    </div>
  )
}

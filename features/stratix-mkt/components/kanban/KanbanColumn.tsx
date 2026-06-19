'use client'
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import KanbanTaskCard from './KanbanTaskCard'

export default function KanbanColumn({ col }: { col: string }) {
  const { s2, s3, border, t1, t3 } = useApp()
  const { dragOver, onDragOverCol, onDrop, porColumna, setNuevaAct, setModalNuevaAct } = useStratix()
  const cards = porColumna(col)
  return (
    <div key={col} onDragOver={e => { e.preventDefault(); onDragOverCol(col) }} onDrop={() => onDrop(col)}
      style={{ borderRadius: 14, overflow: 'hidden', minHeight: 100, background: dragOver === col ? `${ESTADO_COLORS[col]}08` : s2, border: dragOver === col ? `2px dashed ${ESTADO_COLORS[col]}` : `1px solid ${border}`, transition: 'all .15s' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${ESTADO_COLORS[col]}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: ESTADO_COLORS[col] }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{col}</span>
        </div>
        <span style={{ fontSize: 11, color: t3, background: s3, padding: '1px 8px', borderRadius: 10, fontFamily: 'DM Mono' }}>{cards.length}</span>
      </div>
      <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cards.map(a => (
          <KanbanTaskCard key={a.id} a={a} />
        ))}
        {col === 'Pendiente' && (
          <button onClick={() => { setNuevaAct(p => ({ ...p, estado: 'Pendiente' })); setModalNuevaAct(true) }}
            style={{ padding: '8px', borderRadius: 10, border: `1px dashed ${border}`, background: 'transparent', color: t3, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>+</span> Add task
          </button>
        )}
        {cards.length === 0 && col !== 'Pendiente' && (
          <div style={{ border: `2px dashed ${border}`, borderRadius: 10, padding: '20px', textAlign: 'center', color: t3, fontSize: 11 }}>Drop here</div>
        )}
      </div>
    </div>
  )
}

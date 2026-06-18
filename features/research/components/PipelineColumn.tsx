'use client'
import { RESEARCH_THEME } from '../theme'
import { PIPELINE_COLORS } from '../constants'
import { useResearch } from './ResearchContext'
import PipelineCard from './PipelineCard'
import type { Lead } from '../types'

type Props = {
  col: string
  leads: Lead[]
  dragId: string | null
  setDragId: (id: string | null) => void
  dragOver: string | null
  setDragOver: (c: string | null) => void
}

export default function PipelineColumn({ col, leads, dragId, setDragId, dragOver, setDragOver }: Props) {
  const { s1, s2, border, t1, t3 } = RESEARCH_THEME
  const { updateStage, setModalLead } = useResearch()
  const colLeads = leads.filter(l => l.stage === col)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(col) }}
      onDrop={() => { if (dragId) { updateStage(dragId, col); setDragId(null); setDragOver(null) } }}
      onDragLeave={() => setDragOver(null)}
      style={{ flex: 1, minWidth: 170, borderRadius: 14, background: dragOver === col ? `${PIPELINE_COLORS[col]}08` : s2, border: dragOver === col ? `2px dashed ${PIPELINE_COLORS[col]}` : `1px solid ${border}`, transition: 'all .15s' }}>
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${PIPELINE_COLORS[col]}` }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t1 }}>{col}</span>
        <span style={{ fontSize: 10, color: t3, background: s1, padding: '1px 7px', borderRadius: 10, fontFamily: 'DM Mono' }}>{colLeads.length}</span>
      </div>
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 80 }}>
        {colLeads.map(l => (
          <PipelineCard key={l.id} lead={l} dragging={dragId === l.id} onDragStart={() => setDragId(l.id)} onDragEnd={() => { setDragId(null); setDragOver(null) }} onClick={() => setModalLead(l)} />
        ))}
        {colLeads.length === 0 && <div style={{ border: `2px dashed ${border}`, borderRadius: 10, padding: 16, textAlign: 'center', color: t3, fontSize: 10 }}>Drop here</div>}
      </div>
    </div>
  )
}

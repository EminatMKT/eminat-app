'use client'
import { RESEARCH_THEME } from '../theme'
import type { Lead } from '../types'

type Props = {
  lead: Lead
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
}

export default function PipelineCard({ lead: l, dragging, onDragStart, onDragEnd, onClick }: Props) {
  const { s1, border, t1, t3, accent } = RESEARCH_THEME
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      style={{ background: s1, borderRadius: 10, padding: '10px 11px', border: `1px solid ${dragging ? accent : border}`, cursor: 'grab', opacity: dragging ? 0.4 : 1, transition: 'all .15s' }}>
      <div style={{ fontSize: 9, color: accent, fontFamily: 'DM Mono', marginBottom: 4 }}>{l.nct || '—'}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: t1, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.official_title || l.conditions || '—'}</div>
      <div style={{ fontSize: 9, color: t3 }}>{l.lead_sponsor}</div>
      {l.date_added && <div style={{ fontSize: 8, color: t3, marginTop: 4 }}>📅 {l.date_added}</div>}
    </div>
  )
}

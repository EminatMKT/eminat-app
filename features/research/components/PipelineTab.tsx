'use client'
import { useState } from 'react'
import { PIPELINE_COLS } from '../constants'
import { useResearch } from './ResearchContext'
import PipelineColumn from './PipelineColumn'

export default function PipelineTab() {
  const { leads } = useResearch()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10, minWidth: PIPELINE_COLS.length * 180 }}>
        {PIPELINE_COLS.map(col => (
          <PipelineColumn key={col} col={col} leads={leads} dragId={dragId} setDragId={setDragId} dragOver={dragOver} setDragOver={setDragOver} />
        ))}
      </div>
    </div>
  )
}

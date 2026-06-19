'use client'
import { useApp } from '@/shared/context/AppContext'
import { useCobranzas } from './CobranzasContext'
import { TABS } from '../constants'
import CobranzasTabButton from './CobranzasTabButton'

export default function CobranzasTabs() {
  const { border } = useApp()
  const { cobTab, setCobTab, clearFilters } = useCobranzas()
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
      {TABS.map(tab => (
        <CobranzasTabButton key={tab.key} label={tab.label} soon={tab.soon} active={cobTab === tab.key}
          onClick={() => { setCobTab(tab.key); clearFilters() }} />
      ))}
    </div>
  )
}

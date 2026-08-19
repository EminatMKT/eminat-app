'use client'
import { useApp } from '@/shared/context/AppContext'
import { useStratix } from './StratixContext'
import TabButton from '@/shared/components/ui/TabButton'

const NAV_TABS = [{ key: 'overview', label: '📊 Overview' }, { key: 'kanban', label: '⚡ Kanban' }, { key: 'gantt', label: '📊 Gantt' }, { key: 'horas', label: '⏱ Hours' }]

export default function StratixTabNav() {
  const { border } = useApp()
  const { mktTab, setMktTab } = useStratix()
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
      {NAV_TABS.map(t => (
        <TabButton key={t.key} label={t.label} active={mktTab === t.key} onClick={() => setMktTab(t.key)} />
      ))}
    </div>
  )
}

'use client'
import { useApp } from '@/shared/context/AppContext'
import { useStratix } from './StratixContext'

const NAV_TABS = [{ key: 'overview', label: '📊 Overview' }, { key: 'kanban', label: '⚡ Kanban' }, { key: 'gantt', label: '📊 Gantt' }, { key: 'horas', label: '⏱ Hours' }]

export default function StratixTabNav() {
  const { border, accent, t1, t3 } = useApp()
  const { mktTab, setMktTab } = useStratix()
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
      {NAV_TABS.map(t => (
        <button key={t.key} onClick={() => setMktTab(t.key)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: mktTab === t.key ? t1 : t3, borderBottom: mktTab === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
      ))}
    </div>
  )
}

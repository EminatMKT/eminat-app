'use client'
import { useApp } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import SolicitudesListView from './SolicitudesListView'
import SolicitudesAvailabilityView from './SolicitudesAvailabilityView'

const SUB_TABS = [{ key: 'lista', label: '📋 Task list' }, { key: 'disponibilidad', label: '🗓 Availability' }]

const views: Record<string, JSX.Element> = {
  lista: <SolicitudesListView />,
  disponibilidad: <SolicitudesAvailabilityView />,
}

export default function SolicitudesTab() {
  const { border, accent, t1, t3 } = useApp()
  const { solTab, setSolTab } = useStratix()
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${border}` }}>
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSolTab(t.key)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: solTab === t.key ? t1 : t3, borderBottom: solTab === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
        ))}
      </div>
      {views[solTab]}
    </div>
  )
}

'use client'
import { useApp } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import SolicitudesListView from './SolicitudesListView'
import SolicitudesAvailabilityView from './SolicitudesAvailabilityView'
import TabButton from '@/shared/components/ui/TabButton'

const SUB_TABS = [{ key: 'lista', label: '📋 Task list' }, { key: 'disponibilidad', label: '🗓 Availability' }]

const views: Record<string, JSX.Element> = {
  lista: <SolicitudesListView />,
  disponibilidad: <SolicitudesAvailabilityView />,
}

export default function SolicitudesTab() {
  const { border } = useApp()
  const { solTab, setSolTab } = useStratix()
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${border}` }}>
        {SUB_TABS.map(t => (
          <TabButton key={t.key} label={t.label} active={solTab === t.key} onClick={() => setSolTab(t.key)} />
        ))}
      </div>
      {views[solTab]}
    </div>
  )
}

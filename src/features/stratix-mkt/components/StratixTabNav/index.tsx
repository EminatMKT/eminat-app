'use client'
import TabButton from '@/shared/components/ui/TabButton'
import TabBar from '@/shared/components/ui/TabBar'
import { useStratix } from '../StratixContext'

// Sin Overview: el tablero se fue al sidebar como sección propia. Estas tres son las vistas
// operativas de Production — las que se tocan.
const NAV_TABS = [{ key: 'kanban', label: '⚡ Kanban' }, { key: 'gantt', label: '📊 Gantt' }, { key: 'horas', label: '⏱ Hours' }]

export default function StratixTabNav() {
  const { mktTab, setMktTab } = useStratix()
  return (
    <TabBar>
      {NAV_TABS.map(t => (
        <TabButton key={t.key} label={t.label} active={mktTab === t.key} onClick={() => setMktTab(t.key)} />
      ))}
    </TabBar>
  )
}

'use client'
import { useT, type I18nKey } from '@/shared/i18n'
import TabButton from '@/shared/components/ui/TabButton'
import TabBar from '@/shared/components/ui/TabBar'
import { useTasks } from '@/features/tasks/components/TasksContext'
import { useApp } from '@/shared/context/AppContext'
import SolicitudesListView from '../SolicitudesListView'
import SolicitudesAvailabilityView from '../SolicitudesAvailabilityView'

const SUB_TABS: { key: string; icon: string; labelKey: I18nKey }[] = [
  { key: 'lista', icon: '📋', labelKey: 'stratix.sol.tabList' },
  { key: 'disponibilidad', icon: '🗓', labelKey: 'stratix.sol.tabAvailability' },
]

const views: Record<string, JSX.Element> = {
  lista: <SolicitudesListView />,
  disponibilidad: <SolicitudesAvailabilityView />,
}

export default function SolicitudesTab() {
  const { t } = useT()
  const { solTab, setSolTab } = useTasks()
  const { esAdmin } = useApp()
  const visibleTabs = esAdmin ? SUB_TABS : SUB_TABS.filter(tab => tab.key === 'lista')
  return (
    <div>
      <TabBar>
          {visibleTabs.map(tab => (
          <TabButton key={tab.key} label={`${tab.icon} ${t(tab.labelKey)}`}
            active={solTab === tab.key} onClick={() => setSolTab(tab.key)} />
        ))}
      </TabBar>
      {views[esAdmin ? solTab : 'lista']}
    </div>
  )
}

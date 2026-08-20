'use client'
import { useT, type I18nKey } from '@/shared/i18n'
import TabButton from '@/shared/components/ui/TabButton'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import SolicitudesListView from '../SolicitudesListView'
import SolicitudesAvailabilityView from '../SolicitudesAvailabilityView'
import s from './index.module.css'

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
  const { solTab, setSolTab } = useStratix()
  return (
    <div>
      <div className={s.tabs}>
        {SUB_TABS.map(tab => (
          <TabButton key={tab.key} label={`${tab.icon} ${t(tab.labelKey)}`}
            active={solTab === tab.key} onClick={() => setSolTab(tab.key)} />
        ))}
      </div>
      {views[solTab]}
    </div>
  )
}

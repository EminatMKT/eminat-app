'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useT } from '@/shared/i18n'
import { modulePath } from '@/shared/auth/permissions'
import { D, SUB_ITEMS, PANEL_META, type PanelKey } from '@/shared/components/shell/appShellConfig'
import PanelItem from '@/shared/components/shell/PanelItem'

type Props = {
  open: boolean
  panel: PanelKey
  activeTab?: string
  onTabChange?: (tab: string) => void
  setMobileOpen: (v: boolean) => void
}

// Panel secundario del sidebar: título del módulo + sub-tabs. (Perfil/logout viven
// ahora en el avatar del rail, RailProfile, accesible para todo usuario.)
export default function SidebarPanel(props: Props) {
  const { open, panel, activeTab, onTabChange, setMobileOpen } = props
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useT()
  const subItems = SUB_ITEMS[panel]
  const { title: panelTitle, sub: panelSub } = PANEL_META[panel]
  const targetPath = modulePath(PANEL_META[panel].slug)

  // Si el panel es de otro módulo, navegá a ese módulo antes de cambiar de tab.
  function selectTab(tab: string) {
    if (!pathname.startsWith(targetPath)) router.push(targetPath)
    onTabChange?.(tab)
    setMobileOpen(false)
  }

  return (
    <div style={{ width: open ? 172 : 0, background: D.s1, borderRight: open ? `1px solid ${D.border}` : 'none', overflow: 'hidden', transition: 'width .2s ease', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 14px 10px' }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 13, color: D.t1, whiteSpace: 'nowrap' }}>{panelTitle}</div>
        <div style={{ fontSize: 9, color: D.t3, fontFamily: 'DM Mono', marginTop: 2, whiteSpace: 'nowrap' }}>{panelSub}</div>
      </div>
      <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
        {subItems.map(item => (
          <PanelItem key={item.id} icon={item.icon} label={item.labelKey ? t(item.labelKey) : item.label} active={item.tabs ? item.tabs.includes(activeTab ?? '') : activeTab === item.tab} onClick={() => selectTab(item.tab)} />
        ))}
      </nav>
    </div>
  )
}

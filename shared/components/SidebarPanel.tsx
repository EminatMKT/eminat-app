'use client'
import { useRouter, usePathname } from 'next/navigation'
import { modulePath } from '@/shared/auth/permissions'
import { D, SUB_ITEMS, PANEL_META, type PanelKey } from './appShellConfig'
import PanelItem from './PanelItem'

type Props = {
  open: boolean
  panel: PanelKey
  activeTab?: string
  onTabChange?: (tab: string) => void
  setMobileOpen: (v: boolean) => void
}

// Panel secundario del sidebar: título del módulo + sub-tabs. (Perfil/logout viven
// ahora en el avatar del rail, RailProfile, accesible para todo usuario.)
export default function SidebarPanel({ open, panel, activeTab, onTabChange, setMobileOpen }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const subItems = SUB_ITEMS[panel]
  const { title: panelTitle, sub: panelSub } = PANEL_META[panel]
  const targetPath = modulePath(PANEL_META[panel].slug)

  return (
    <div style={{ width: open ? 172 : 0, background: D.s1, borderRight: open ? `1px solid ${D.border}` : 'none', overflow: 'hidden', transition: 'width .2s ease', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 14px 10px' }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 13, color: D.t1, whiteSpace: 'nowrap' }}>{panelTitle}</div>
        <div style={{ fontSize: 9, color: D.t3, fontFamily: 'DM Mono', marginTop: 2, whiteSpace: 'nowrap' }}>{panelSub}</div>
      </div>
      <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
        {subItems.map(item => (
          <PanelItem key={item.id} icon={item.icon} label={item.label} active={activeTab === item.tab} onClick={() => {
            // Si el panel es de otro módulo, navegá a ese módulo antes de cambiar de tab.
            if (!pathname.startsWith(targetPath)) router.push(targetPath)
            onTabChange?.(item.tab)
            setMobileOpen(false)
          }} />
        ))}
      </nav>
    </div>
  )
}

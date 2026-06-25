'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
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

// Panel secundario del sidebar: título del módulo + sub-tabs + tarjeta de perfil/logout.
export default function SidebarPanel({ open, panel, activeTab, onTabChange, setMobileOpen }: Props) {
  const { usuario, cargo, accent, handleLogout } = useApp()
  const { t } = useT()
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
      <div style={{ padding: 10, borderTop: `1px solid ${D.border}` }}>
        <div style={{ padding: '10px 10px', borderRadius: 10, background: `${accent}08`, border: `1px solid ${accent}15` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
              </div>
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#34D399', border: `2px solid ${D.s1}` }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre}</div>
              <div style={{ fontSize: 9, color: accent, whiteSpace: 'nowrap' }}>{cargo}</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: D.t3, marginBottom: 6, whiteSpace: 'nowrap' }}>📍 {usuario?.ubicacion || 'Guayaquil, EC'}</div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '4px', borderRadius: 6, border: `1px solid ${D.border}`, background: 'transparent', color: D.t3, fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('common.signOut')}</button>
        </div>
      </div>
    </div>
  )
}

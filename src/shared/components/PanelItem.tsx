'use client'
import { useApp } from '@/shared/context/AppContext'
import { D } from './appShellConfig'

type Props = { icon: string; label: string; active: boolean; onClick: () => void }

// Sub-tab del panel secundario del sidebar.
export default function PanelItem({ icon, label, active, onClick }: Props) {
  const { accent } = useApp()
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500, textAlign: 'left', whiteSpace: 'nowrap', color: active ? accent : D.t2, background: active ? `${accent}15` : 'transparent', marginBottom: 2, transition: 'all .15s' }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      {label}
      {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: accent }} />}
    </button>
  )
}

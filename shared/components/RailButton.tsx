'use client'
import { useApp } from '@/shared/context/AppContext'
import { D } from './appShellConfig'

type Props = { tourKey: string; icon: string; label: string; active: boolean; onClick: () => void }

// Botón del rail principal del sidebar (un ícono de módulo / Home).
export default function RailButton({ tourKey, icon, label, active, onClick }: Props) {
  const { accent } = useApp()
  return (
    <button data-tour={tourKey} onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, width: 52, height: 52, borderRadius: 12, border: 'none', cursor: 'pointer', background: active ? `${accent}18` : 'transparent', color: active ? accent : D.t2, transition: 'all .15s', position: 'relative' }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 8, fontWeight: 600, fontFamily: 'DM Sans', letterSpacing: '.02em', lineHeight: 1 }}>{label}</span>
      {active && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: '0 3px 3px 0', background: accent }} />}
    </button>
  )
}

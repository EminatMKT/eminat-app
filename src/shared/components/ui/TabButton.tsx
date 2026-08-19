'use client'
import { useApp } from '@/shared/context/AppContext'

// Botón de tab secundario (la barra con borderBottom que usan cobranzas, medical y stratix).
// icon y soon son opcionales; padding tiene un default y se puede override para casos puntuales.
export default function TabButton({ label, icon, soon, active, onClick, padding = '8px 18px' }: {
  label: string
  icon?: string
  soon?: boolean
  active: boolean
  onClick: () => void
  padding?: string
}) {
  const { t1, t3, accent } = useApp()
  return (
    <button onClick={onClick}
      style={{ padding, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: active ? t1 : t3, borderBottom: active ? `2px solid ${accent}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
      {label}
      {soon && <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 4, background: `${t3}30`, color: t3, fontFamily: 'DM Mono' }}>SOON</span>}
    </button>
  )
}

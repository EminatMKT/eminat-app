'use client'
import { useApp } from '@/shared/context/AppContext'

export default function CobranzasTabButton({ label, active, soon, onClick }: { label: string; active: boolean; soon?: boolean; onClick: () => void }) {
  const { t1, t3, accent } = useApp()
  return (
    <button onClick={onClick}
      style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: active ? t1 : t3, borderBottom: active ? `2px solid ${accent}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
      {label}
      {soon && <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 4, background: `${t3}30`, color: t3, fontFamily: 'DM Mono' }}>SOON</span>}
    </button>
  )
}

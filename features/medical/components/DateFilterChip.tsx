'use client'
import { useApp } from '@/shared/context/AppContext'

export default function DateFilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const { s2, border, t2, accent } = useApp()
  return (
    <button onClick={onClick}
      style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? accent : border}`, background: active ? `${accent}18` : s2, color: active ? accent : t2, fontFamily: 'DM Sans' }}>
      {label}
    </button>
  )
}

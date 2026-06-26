'use client'
import { useApp } from '@/shared/context/AppContext'

export default function RoleChip({ role, label, active, onClick }: { role: string; label?: string; active: boolean; onClick: () => void }) {
  const { border, t2 } = useApp()
  return (
    <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${active ? '#F87171' : border}`, background: active ? 'rgba(248,113,113,.15)' : 'transparent', color: active ? '#F87171' : t2, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>{label ?? role}</button>
  )
}

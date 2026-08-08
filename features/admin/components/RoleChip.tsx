'use client'
import { useApp } from '@/shared/context/AppContext'

export default function RoleChip({ role, label, active, onClick }: { role: string; label?: string; active: boolean; onClick: () => void }) {
  const { border, t2, accent } = useApp()
  // El filtro activo se marca con el acento, no con el rojo: ese color queda
  // reservado para lo destructivo (borrar) y los errores.
  return (
    <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${active ? accent : border}`, background: active ? `${accent}26` : 'transparent', color: active ? accent : t2, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>{label ?? role}</button>
  )
}

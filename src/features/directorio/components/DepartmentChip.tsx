'use client'
import { useApp, DIRECTORIO_DATA } from '@/shared/context/AppContext'

export default function DepartmentChip({ dep, active, onClick }: { dep: string; active: boolean; onClick: () => void }) {
  const { border, t2, accent } = useApp()
  const count = dep !== 'Todos' ? DIRECTORIO_DATA.filter(m => m.departamento === dep).length : null
  return (
    <button onClick={onClick} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${active ? accent : border}`, background: active ? accent : 'transparent', color: active ? 'white' : t2, cursor: 'pointer' }}>
      {dep} {count !== null && <span style={{ opacity: .6 }}>{count}</span>}
    </button>
  )
}

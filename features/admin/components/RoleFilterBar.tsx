'use client'
import { useApp, ROLES } from '@/shared/context/AppContext'
import RoleChip from './RoleChip'

type Props = {
  busqueda: string
  setBusqueda: (v: string) => void
  filtroRol: string
  setFiltroRol: (v: string) => void
}

export default function RoleFilterBar({ busqueda, setBusqueda, filtroRol, setFiltroRol }: Props) {
  const { inputStyle } = useApp()
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      <input type="text" placeholder="Search..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inputStyle, width: 220 }} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['todos', ...ROLES].map(r => <RoleChip key={r} role={r} active={filtroRol === r} onClick={() => setFiltroRol(r)} />)}
      </div>
    </div>
  )
}

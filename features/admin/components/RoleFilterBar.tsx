'use client'
import { useApp } from '@/shared/context/AppContext'
import RoleChip from './RoleChip'

type Props = {
  busqueda: string
  setBusqueda: (v: string) => void
  filtroRol: string
  setFiltroRol: (v: string) => void
}

export default function RoleFilterBar({ busqueda, setBusqueda, filtroRol, setFiltroRol }: Props) {
  const { inputStyle, roles } = useApp()
  const chips = [{ key: 'todos', label: 'Todos' }, ...roles.map(r => ({ key: r.key, label: r.label }))]
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      <input type="text" placeholder="Search..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inputStyle, width: 220 }} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {chips.map(c => <RoleChip key={c.key} role={c.key} label={c.label} active={filtroRol === c.key} onClick={() => setFiltroRol(c.key)} />)}
      </div>
    </div>
  )
}

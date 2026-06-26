'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import RoleChip from './RoleChip'

type Props = {
  busqueda: string
  setBusqueda: (v: string) => void
  filtroRol: string
  setFiltroRol: (v: string) => void
}

// Fade SOLO en el borde derecho para insinuar el scroll horizontal sin scrollbar
// grotesca. (No izquierdo: pegado a la barra de búsqueda desvanecía el 1er badge.)
const fade = 'linear-gradient(to right, black calc(100% - 16px), transparent 100%)'

export default function RoleFilterBar({ busqueda, setBusqueda, filtroRol, setFiltroRol }: Props) {
  const { inputStyle, roles, adminUsuarios } = useApp()
  const { t } = useT()
  // Solo roles con ≥1 usuario (más el activo, para no romper el filtro vigente si se vacía).
  const usados = new Set(adminUsuarios.map(u => u.rol))
  const visibles = roles.filter(r => usados.has(r.key) || r.key === filtroRol)
  const chips = [{ key: 'todos', label: t('admin.filterAll') }, ...visibles.map(r => ({ key: r.key, label: r.label }))]
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
      <input type="text" placeholder={t('common.search')} value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inputStyle, width: 220 }} />
      <div style={{ display: 'flex', gap: 6, flex: '1 1 auto', minWidth: 0, overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'thin', WebkitMaskImage: fade, maskImage: fade, padding: '2px 0' }}>
        {chips.map(c => <RoleChip key={c.key} role={c.key} label={c.label} active={filtroRol === c.key} onClick={() => setFiltroRol(c.key)} />)}
      </div>
    </div>
  )
}

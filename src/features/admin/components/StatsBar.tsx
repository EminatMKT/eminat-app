'use client'
import { useApp } from '@/shared/context/AppContext'
import { StaggerGrid } from '@/shared/motion'
import StatCard from './StatCard'

export default function StatsBar() {
  const { adminUsuarios, accent } = useApp()
  const stats = [
    { label: 'Total usuarios', value: adminUsuarios.length, color: accent },
    // "Activo" exige cuenta: sin fila en auth.users no se puede entrar, así que
    // contarlo como activo infla el número con gente que no tiene acceso.
    { label: 'Activos', value: adminUsuarios.filter(u => u.activo && u.validado && u.auth_id).length, color: '#34D399' },
    { label: 'Sin cuenta', value: adminUsuarios.filter(u => !u.auth_id).length, color: '#FBB040' },
    { label: 'Stratix 360', value: adminUsuarios.filter(u => u.rol === 'stratix360').length, color: '#60A5FA' },
  ]
  return (
    <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {stats.map(s => <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />)}
    </StaggerGrid>
  )
}

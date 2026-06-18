'use client'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/AppShell'
import { PageTransition, StaggerGrid } from '@/shared/motion'
import { useDirectorioFilter } from '../hooks/useDirectorioFilter'
import DepartmentFilter from './DepartmentFilter'
import MemberCard from './MemberCard'

export default function DirectorioModule() {
  const { t1, inputStyle } = useApp()
  const { busqueda, setBusqueda, filtro, setFiltro, filtrados, total } = useDirectorioFilter()

  return (
    <AppShell>
      <PageTransition><div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Syne', color: t1 }}>{total} Eminat Group members</div>
          <input type="text" placeholder="Search by name, role or email..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inputStyle, width: 280 }} />
        </div>
        <DepartmentFilter filtro={filtro} setFiltro={setFiltro} />
        <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
          {filtrados.map(m => <MemberCard key={m.email} member={m} />)}
        </StaggerGrid>
      </div></PageTransition>
    </AppShell>
  )
}

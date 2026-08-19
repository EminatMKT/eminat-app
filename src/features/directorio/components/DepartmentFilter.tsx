'use client'
import { DEPS_DIR } from '@/shared/context/AppContext'
import DepartmentChip from './DepartmentChip'

export default function DepartmentFilter({ filtro, setFiltro }: { filtro: string; setFiltro: (d: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
      {DEPS_DIR.map(dep => (
        <DepartmentChip key={dep} dep={dep} active={filtro === dep} onClick={() => setFiltro(dep)} />
      ))}
    </div>
  )
}

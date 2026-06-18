'use client'
import { useApp, DIRECTORIO_DATA, DEPS_DIR } from '@/shared/context/AppContext'

export default function DepartmentFilter({ filtro, setFiltro }: { filtro: string; setFiltro: (d: string) => void }) {
  const { border, t2, accent } = useApp()
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
      {DEPS_DIR.map(dep => (
        <button key={dep} onClick={() => setFiltro(dep)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${filtro === dep ? accent : border}`, background: filtro === dep ? accent : 'transparent', color: filtro === dep ? 'white' : t2, cursor: 'pointer' }}>
          {dep} {dep !== 'Todos' && <span style={{ opacity: .6 }}>{DIRECTORIO_DATA.filter(m => m.departamento === dep).length}</span>}
        </button>
      ))}
    </div>
  )
}

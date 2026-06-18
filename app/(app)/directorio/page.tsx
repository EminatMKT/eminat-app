'use client'
import { useState } from 'react'
import { useApp, DIRECTORIO_DATA, DEPS_DIR, EMPRESA_COLORS, getIniciales } from '@/lib/AppContext'
import AppShell from '@/app/components/AppShell'
import { PageTransition, StaggerGrid, StaggerItem } from '@/shared/motion'

export default function DirectorioPage() {
  const { s1, border, t1, t2, t3, accent, inputStyle } = useApp()
  const [busquedaDir, setBusquedaDir] = useState('')
  const [filtroDir, setFiltroDir] = useState('Todos')

  const dirFiltrado = DIRECTORIO_DATA.filter((m: any) => {
    if (filtroDir !== 'Todos' && m.departamento !== filtroDir) return false
    if (busquedaDir) {
      const q = busquedaDir.toLowerCase()
      return m.nombre.toLowerCase().includes(q) || m.cargo.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <AppShell>
      <PageTransition><div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Syne', color: t1 }}>{DIRECTORIO_DATA.length} Eminat Group members</div>
          <input type="text" placeholder="Search by name, role or email..." value={busquedaDir} onChange={e => setBusquedaDir(e.target.value)} style={{ ...inputStyle, width: 280 }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {DEPS_DIR.map(dep => (
            <button key={dep} onClick={() => setFiltroDir(dep)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${filtroDir === dep ? accent : border}`, background: filtroDir === dep ? accent : 'transparent', color: filtroDir === dep ? 'white' : t2, cursor: 'pointer' }}>
              {dep} {dep !== 'Todos' && <span style={{ opacity: .6 }}>{DIRECTORIO_DATA.filter(m => m.departamento === dep).length}</span>}
            </button>
          ))}
        </div>
        <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
          {dirFiltrado.map((m: any, i: number) => {
            const ec = EMPRESA_COLORS[m.empresa] || accent
            return (
              <StaggerItem key={i} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>{getIniciales(m.nombre)}</div>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: `${ec}20`, color: ec }}>{m.empresa.replace('Eminat ', '').replace(' by Eminat', '')}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{m.nombre}{m.credenciales && <span style={{ fontSize: 9, color: t3, marginLeft: 4 }}>{m.credenciales}</span>}</div>
                {m.nickname && <div style={{ fontSize: 10, color: t3 }}>"{m.nickname}"</div>}
                <div style={{ fontSize: 11, color: t2, marginTop: 3 }}>{m.cargo}</div>
                <div style={{ borderTop: `1px solid ${border}`, marginTop: 8, paddingTop: 8 }}>
                  <a href={`mailto:${m.email}`} style={{ fontSize: 10, color: accent, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {m.email}</a>
                  <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{m.ubicacion}</div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerGrid>
      </div></PageTransition>
    </AppShell>
  )
}

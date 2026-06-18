'use client'
import { useApp, EMPRESA_COLORS, getIniciales } from '@/shared/context/AppContext'
import { StaggerItem } from '@/shared/motion'
import type { Member } from '../types'

export default function MemberCard({ member: m }: { member: Member }) {
  const { s1, border, t1, t2, t3, accent } = useApp()
  const ec = EMPRESA_COLORS[m.empresa] || accent
  return (
    <StaggerItem style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
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
}

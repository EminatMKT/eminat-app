'use client'
import { useApp, getIniciales } from '@/shared/context/AppContext'
import { StaggerItem } from '@/shared/motion'
import AvatarArt from '@/shared/components/AvatarArt'
import type { Member } from '../types'

export default function MemberCard({ member: m }: { member: Member }) {
  const { s1, border, t1, t2, t3, accent, empresas } = useApp()
  const emp = empresas.find(e => e.id === m.empresaId)
  const ec = emp?.color || accent
  return (
    <StaggerItem style={{ background: s1, border: `1px solid ${border}`, borderRadius: 16, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 14, gap: 8 }}>
        {m.avatarKey ? <AvatarArt avatarKey={m.avatarKey} size={56} /> : <div style={{ width: 56, height: 56, borderRadius: 14, background: m.color, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700, color: 'white' }}>{getIniciales(m.nombre)}</div>}
        {m.empresa && <span title={m.empresa} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 20, background: `${ec}20`, color: ec, textAlign: 'right' }}>{emp?.codigo || m.empresa}</span>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{m.nombre}</div>
      {m.cargo && <div style={{ fontSize: 12, color: t2, marginTop: 4 }}>{m.cargo}</div>}
      {m.departamento && <div style={{ fontSize: 10, color: t3, marginTop: 3 }}>{m.departamento}</div>}
      <div style={{ borderTop: `1px solid ${border}`, marginTop: 14, paddingTop: 12 }}>
        {m.email && <a href={`mailto:${m.email}`} style={{ fontSize: 11, color: accent, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {m.email}</a>}
        {m.ubicacion && <div style={{ fontSize: 11, color: t3, marginTop: 5 }}>📍 {m.ubicacion}</div>}
      </div>
    </StaggerItem>
  )
}

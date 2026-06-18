'use client'
import { useApp, ROLES } from '@/shared/context/AppContext'
import { COMPANY_COLORS, companyShort } from '@/shared/constants/companies'
import { useUserActions } from '../hooks/useUserActions'
import type { AdminUser, ResetTarget } from '../types'

type Props = {
  user: AdminUser
  onEdit: (u: AdminUser) => void
  onReset: (t: ResetTarget) => void
  onDelete: (id: string) => void
}

export default function UserRow({ user: u, onEdit, onReset, onDelete }: Props) {
  const { s2, border, t1, t2, t3, accent } = useApp()
  const { cambiarRol, toggleActivo, validarUsuario } = useUserActions()
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>{u.nombre?.[0]}{u.apellido?.[0]}</div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>{u.nombre} {u.apellido}</div><div style={{ fontSize: 9, color: t3 }}>Tipo {u.tipo || 'B'} · {u.ubicacion || 'Ecuador'}</div></div>
        </div>
      </td>
      <td style={{ padding: '10px 14px', fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{u.email}</td>
      <td style={{ padding: '10px 14px', fontSize: 11, color: t2 }}>{u.cargo || '—'}</td>
      <td style={{ padding: '10px 14px' }}>{u.empresa ? <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: `${COMPANY_COLORS[u.empresa] || accent}20`, color: COMPANY_COLORS[u.empresa] || accent }}>{companyShort(u.empresa)}</span> : <span style={{ fontSize: 10, color: t3 }}>—</span>}</td>
      <td style={{ padding: '10px 14px' }}>{u.rol === 'superadmin' ? <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(248,113,113,.12)', color: '#F87171' }}>superadmin</span> : <select value={u.rol} onChange={e => cambiarRol(u.id, e.target.value)} style={{ padding: '3px 8px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', outline: 'none' }}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>}</td>
      <td style={{ padding: '10px 14px' }}>{u.validado && u.activo ? <span style={{ fontSize: 11, color: '#34D399' }}>● Activo</span> : !u.validado ? <span style={{ fontSize: 11, color: '#FBB040' }}>Pendiente</span> : <span style={{ fontSize: 11, color: '#F87171' }}>Inactivo</span>}</td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => onEdit(u)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(124,111,247,.3)', background: 'transparent', color: '#7C6FF7', cursor: 'pointer' }}>Edit</button>
          <button onClick={() => onReset({ id: u.id, nombre: u.nombre || '', email: u.email || '' })} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(96,165,250,.3)', background: 'transparent', color: '#60A5FA', cursor: 'pointer' }}>Reset pwd</button>
          {!u.validado && <button onClick={() => validarUsuario(u.id)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(52,211,153,.3)', background: 'transparent', color: '#34D399', cursor: 'pointer' }}>Validate</button>}
          {u.rol !== 'superadmin' && <button onClick={() => toggleActivo(u.id, !!u.activo)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(251,176,64,.3)', background: 'transparent', color: '#FBB040', cursor: 'pointer' }}>{u.activo ? 'Deactivate' : 'Activate'}</button>}
          {u.rol !== 'superadmin' && <button onClick={() => onDelete(u.id)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(248,113,113,.3)', background: 'transparent', color: '#F87171', cursor: 'pointer' }}>Delete</button>}
        </div>
      </td>
    </tr>
  )
}

'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { D } from './appShellConfig'

// Avatar al pie del rail. Click → popover con nombre + cerrar sesión. Es el ÚNICO
// acceso a logout para usuarios sin módulos (sin_asignar no abre ningún panel).
export default function RailProfile() {
  const { usuario, cargo, accent, handleLogout, roles } = useApp()
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const roleLabel = roles.find((r: { key: string; label: string }) => r.key === usuario?.rol)?.label || usuario?.rol

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} title={t('common.signOut')}
        style={{ position: 'relative', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
          {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
        </div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#34D399', border: `2px solid ${D.s1}` }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', bottom: 0, left: '110%', width: 190, background: D.s1, border: `1px solid ${D.border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 60, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: D.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre} {usuario?.apellido}</div>
          <div style={{ fontSize: 10, color: accent, marginTop: 1, whiteSpace: 'nowrap' }}>{roleLabel}</div>
          {cargo && <div style={{ fontSize: 10, color: D.t2, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cargo}</div>}
          <div style={{ fontSize: 9, color: D.t3, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.email}</div>
          <div style={{ fontSize: 9, color: D.t3, marginTop: 2, marginBottom: 8, whiteSpace: 'nowrap' }}>📍 {usuario?.ubicacion || 'Guayaquil, EC'}</div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '6px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.t2, fontSize: 11, cursor: 'pointer' }}>{t('common.signOut')}</button>
        </div>
      )}
    </div>
  )
}

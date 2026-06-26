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
        <div style={{ position: 'absolute', bottom: 0, left: '110%', width: 180, background: D.s1, border: `1px solid ${D.border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 60, padding: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
              </div>
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#34D399', border: `2px solid ${D.s1}` }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre}</div>
              <div style={{ fontSize: 9, color: accent, whiteSpace: 'nowrap' }}>{roleLabel}</div>
            </div>
          </div>
          {cargo && <div style={{ fontSize: 9, color: D.t2, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cargo}</div>}
          <div style={{ fontSize: 9, color: D.t3, marginBottom: 6, whiteSpace: 'nowrap' }}>📍 {usuario?.ubicacion || 'Guayaquil, EC'}</div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '4px', borderRadius: 6, border: `1px solid ${D.border}`, background: 'transparent', color: D.t3, fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('common.signOut')}</button>
        </div>
      )}
    </div>
  )
}

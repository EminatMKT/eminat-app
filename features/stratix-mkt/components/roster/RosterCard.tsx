'use client'
import { useApp } from '@/shared/context/AppContext'

export default function RosterCard({ user, esLider }: { user: any; esLider: boolean }) {
  const { s1, border, accent, t1, t2, t3, actividades } = useApp()
  const nombreCompleto = `${user.nombre || ''} ${user.apellido || ''}`.trim()
  const initials = nombreCompleto.split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
  const tieneCuenta = !!user.auth_id
  const isOnline = user.online_at ? new Date(user.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
  const tareasHoy = user.responsable_ref
    ? actividades.filter((a) => a.responsable_ref === user.responsable_ref && a.estado === 'En proceso').length
    : 0
  const swatch = user.color || accent
  const cargo = user.cargos?.nombre || user.cargo || ''
  return (
    <div style={{ background: s1, border: `1px solid ${esLider ? `${accent}55` : border}`, borderRadius: 14, padding: 16, boxShadow: esLider ? `0 2px 8px ${accent}20` : '0 1px 3px rgba(0,0,0,0.06)', position: 'relative', opacity: tieneCuenta ? 1 : 0.92 }}>
      {esLider && (
        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 700, letterSpacing: '.1em', padding: '2px 8px', borderRadius: 10, background: accent, color: 'white' }}>{/* i18n-ignore */}LÍDER</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: swatch, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>{initials}</div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: tieneCuenta ? (isOnline ? '#34D399' : '#555') : '#9CA3AF', border: `2px solid ${s1}` }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{nombreCompleto}</div>
          <div style={{ fontSize: 11, color: t2, marginTop: 1 }}>{cargo}</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: t3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tieneCuenta ? `✉ ${user.email}` : '✉ — sin cuenta todavía'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {tieneCuenta ? (
          <span style={{ fontSize: 10, color: isOnline ? '#34D399' : t3 }}>{isOnline ? '● Active now' : 'Offline'}</span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#FBB040', background: '#FBB04015', padding: '2px 8px', borderRadius: 10 }}>{/* i18n-ignore */}Cuenta por crear</span>
        )}
        {tareasHoy > 0 && (
          <span style={{ fontSize: 10, color: '#FBB040', background: '#FBB04015', padding: '2px 8px', borderRadius: 10 }}>{tareasHoy} in progress</span>
        )}
      </div>
    </div>
  )
}

'use client'
import { useApp } from '@/shared/context/AppContext'
import { D } from './appShellConfig'

// Una fila del dropdown de notificaciones.
export default function NotificationItem({ notif: n, onClick }: { notif: any; onClick: () => void }) {
  const { accent } = useApp()
  return (
    <div onClick={onClick}
      style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}`, cursor: n.actividad_id ? 'pointer' : 'default', background: n.leida ? 'transparent' : `${accent}08`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.leida ? 'transparent' : accent, flexShrink: 0, marginTop: 4 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: n.leida ? 400 : 600, color: D.t1 }}>{n.titulo}</div>
        <div style={{ fontSize: 11, color: D.t2, marginTop: 2, lineHeight: 1.4 }}>{n.mensaje}</div>
        <div style={{ fontSize: 10, color: D.t3, marginTop: 4 }}>{new Date(n.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  )
}

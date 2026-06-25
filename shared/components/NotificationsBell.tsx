'use client'
import { useRouter } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { notificacionesRepo } from '@/shared/data'
import { D } from './appShellConfig'

export default function NotificationsBell() {
  const router = useRouter()
  const { t } = useT()
  const { accent, notificaciones, notifAbiertas, setNotifAbiertas, setNotificaciones } = useApp()
  const unread = notificaciones.filter((n: any) => !n.leida).length

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { setNotifAbiertas(!notifAbiertas); if (!notifAbiertas) { const ids = notificaciones.filter((n: any) => !n.leida).map((n: any) => n.id); if (ids.length > 0) notificacionesRepo.markReadByIds(ids).then(() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))) } }}
        style={{ position: 'relative', padding: '7px 9px', borderRadius: 10, border: `1px solid ${D.border}`, background: notifAbiertas ? `${accent}20` : D.s2, color: notifAbiertas ? accent : D.t2, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#F87171', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${D.s1}` }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {notifAbiertas && (
        <div style={{ position: 'absolute', top: '110%', right: 0, width: 320, background: D.s1, border: `1px solid ${D.border}`, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: D.t1 }}>{t('notif.title')}</div>
            <button onClick={() => { notificacionesRepo.markAllRead().then(() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))) }} style={{ fontSize: 11, color: D.t3, background: 'none', border: 'none', cursor: 'pointer' }}>{t('notif.markAllRead')}</button>
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notificaciones.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: D.t3 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                <div style={{ fontSize: 12 }}>{t('notif.empty')}</div>
              </div>
            ) : notificaciones.map((n: any) => (
              <div key={n.id} onClick={() => { if (n.actividad_id) { router.push('/stratix-mkt'); setNotifAbiertas(false) } }}
                style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}`, cursor: n.actividad_id ? 'pointer' : 'default', background: n.leida ? 'transparent' : `${accent}08`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.leida ? 'transparent' : accent, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: n.leida ? 400 : 600, color: D.t1 }}>{n.titulo}</div>
                  <div style={{ fontSize: 11, color: D.t2, marginTop: 2, lineHeight: 1.4 }}>{n.mensaje}</div>
                  <div style={{ fontSize: 10, color: D.t3, marginTop: 4 }}>{new Date(n.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useRouter } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { modulePath } from '@/shared/auth/permissions'
import { notificacionesRepo } from '@/shared/data'
import { D } from './appShellConfig'
import NotificationItem from './NotificationItem'

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
              <NotificationItem key={n.id} notif={n} onClick={() => { if (n.actividad_id) { router.push(modulePath('stratix-mkt')); setNotifAbiertas(false) } }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

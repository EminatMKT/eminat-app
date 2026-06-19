'use client'
import { useApp } from '@/shared/context/AppContext'

export default function TeamOnlineRow({ u }: { u: any }) {
  const { s1, border, accent, t1, t3, usuarios } = useApp()
  const userInfo = usuarios.find((us: any) => us.nombre === u.nombre)
  const isOnline = userInfo?.online_at ? new Date(userInfo.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
  return (
    <div style={{ padding: '8px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white' }}>{u.nombre?.[0]}{u.apellido?.[0]}</div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: isOnline ? '#34D399' : '#555', border: `2px solid ${s1}` }} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{u.nombre}</div>
        <div style={{ fontSize: 9, color: isOnline ? '#34D399' : t3 }}>{isOnline ? '● Active now' : 'Offline'}</div>
      </div>
    </div>
  )
}

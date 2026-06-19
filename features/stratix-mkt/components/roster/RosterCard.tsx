'use client'
import { useApp } from '@/shared/context/AppContext'
import type { RosterEntry } from './roster-data'

export default function RosterCard({ entry, user, accentOverride }: { entry: RosterEntry; user: any | null; accentOverride?: string }) {
  const { s1, border, accent, t1, t2, t3, actividades } = useApp()
  const isLeader = entry.leader
  const initials = entry.nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  const isOnline = user?.online_at
    ? new Date(user.online_at) > new Date(Date.now() - 5 * 60 * 1000)
    : false
  const tareasHoy = user
    ? actividades.filter(
        (a) => a.responsable_ref === user.responsable_ref && a.estado === 'En proceso',
      ).length
    : 0
  const swatch = user?.color || accentOverride || accent
  return (
    <div
      key={entry.nombre}
      style={{
        background: s1,
        border: `1px solid ${isLeader ? `${accentOverride || accent}55` : border}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: isLeader
          ? `0 2px 8px ${accentOverride || accent}20`
          : '0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
        opacity: user ? 1 : 0.92,
      }}
    >
      {isLeader && (
        <span
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '.1em',
            padding: '2px 8px',
            borderRadius: 10,
            background: accentOverride || accent,
            color: 'white',
          }}
        >
          LÍDER
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: swatch,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: 'white',
            }}
          >
            {initials}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: user ? (isOnline ? '#34D399' : '#555') : '#9CA3AF',
              border: `2px solid ${s1}`,
            }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{entry.nombre}</div>
          <div style={{ fontSize: 11, color: t2, marginTop: 1 }}>{entry.titulo}</div>
        </div>
      </div>
      <div
        style={{
          fontSize: 10,
          color: t3,
          marginBottom: 6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {user ? `✉ ${user.email}` : '✉ — sin cuenta todavía'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {user ? (
          <span style={{ fontSize: 10, color: isOnline ? '#34D399' : t3 }}>
            {isOnline ? '● Active now' : 'Offline'}
          </span>
        ) : (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#FBB040',
              background: '#FBB04015',
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            Cuenta por crear
          </span>
        )}
        {user && tareasHoy > 0 && (
          <span
            style={{
              fontSize: 10,
              color: '#FBB040',
              background: '#FBB04015',
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            {tareasHoy} in progress
          </span>
        )}
      </div>
    </div>
  )
}

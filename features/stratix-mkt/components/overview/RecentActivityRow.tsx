'use client'
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'

export default function RecentActivityRow({ a }: { a: any }) {
  const { border, t1, t3 } = useApp()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: `1px solid ${border}` }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: ESTADO_COLORS[a.estado] || t3, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</div>
        <div style={{ fontSize: 9, color: t3 }}>{a.area_ref} · {a.responsable_ref} · {a.mes}</div>
      </div>
      <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 9, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3, whiteSpace: 'nowrap' }}>{a.estado}</span>
    </div>
  )
}

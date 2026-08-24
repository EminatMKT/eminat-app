'use client'
import { useApp } from '@/shared/context/AppContext'
import Badge from './Badge'
import { SEVERIDAD_COLORS } from '../constants'
import type { HipaaIncidente } from '../types'

export default function IncidentAlertCard({ incidente: i }: { incidente: HipaaIncidente }) {
  const { t1, t3, accent } = useApp()
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: `${SEVERIDAD_COLORS[i.severidad]}08`, border: `1px solid ${SEVERIDAD_COLORS[i.severidad]}25`, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Badge color={SEVERIDAD_COLORS[i.severidad]}>{i.severidad}</Badge>
        <Badge color={accent}>{i.tipo}</Badge>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>{i.titulo}</div>
      <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{i.fecha_incidente} · Reported by {i.reportado_por}</div>
    </div>
  )
}

'use client'
import { useApp } from '@/shared/context/AppContext'
import Badge from './Badge'
import { ESTADO_CITA_COLORS } from '../constants'
import type { Cita } from '../types'

export default function TodayAppointmentItem({ cita: c }: { cita: Cita }) {
  const { t1, t2, t3, accent, border } = useApp()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${border}` }}>
      <div style={{ width: 42, textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{c.hora}</div>
        <div style={{ fontSize: 9, color: t3 }}>{c.duracion}min</div>
      </div>
      <div style={{ width: 3, height: 32, borderRadius: 2, background: ESTADO_CITA_COLORS[c.estado] || accent }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>{c.paciente_nombre}</div>
        <div style={{ fontSize: 10, color: t2 }}>{c.tipo} · {c.doctor}</div>
      </div>
      <Badge color={ESTADO_CITA_COLORS[c.estado] || accent}>{c.estado}</Badge>
    </div>
  )
}

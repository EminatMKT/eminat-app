'use client'
import { useApp } from '@/shared/context/AppContext'
import Badge from './Badge'
import { ESTADO_CITA_COLORS } from '../constants'
import type { Cita } from '../types'

export default function PatientApptRow({ cita: c }: { cita: Cita }) {
  const { t1, t2, t3, accent, border } = useApp()
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ padding: '8px 10px', color: t1, fontFamily: 'DM Mono', fontSize: 10 }}>{c.fecha}</td>
      <td style={{ padding: '8px 10px', color: t1 }}>{c.hora}</td>
      <td style={{ padding: '8px 10px', color: t2 }}>{c.tipo}</td>
      <td style={{ padding: '8px 10px', color: t2 }}>{c.doctor}</td>
      <td style={{ padding: '8px 10px', color: t3 }}>{c.sala}</td>
      <td style={{ padding: '8px 10px' }}><Badge color={ESTADO_CITA_COLORS[c.estado] || accent}>{c.estado}</Badge></td>
    </tr>
  )
}

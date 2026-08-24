'use client'
import { useApp } from '@/shared/context/AppContext'
import Badge from './Badge'
import type { HipaaTraining } from '../types'

export default function TrainingRow({ training: t }: { training: HipaaTraining }) {
  const { t1, t2, t3, border } = useApp()
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ padding: '8px 6px', color: t1, fontWeight: 500 }}>{t.usuario_nombre}</td>
      <td style={{ padding: '8px 6px', color: t2, fontSize: 10 }}>{t.curso}</td>
      <td style={{ padding: '8px 6px', fontFamily: 'DM Mono', fontSize: 10, color: t.estado === 'vencido' ? '#F87171' : t3 }}>{t.fecha_vencimiento}</td>
      <td style={{ padding: '8px 6px', color: t1, fontWeight: 600 }}>{t.puntuacion !== null ? `${t.puntuacion}%` : '—'}</td>
      <td style={{ padding: '8px 6px' }}>
        <Badge color={t.estado === 'completado' ? '#34D399' : t.estado === 'vencido' ? '#F87171' : '#FBB040'}>{t.estado}</Badge>
      </td>
    </tr>
  )
}

'use client'
import { useApp } from '@/shared/context/AppContext'
import Badge from './Badge'
import { NIVEL_LOG_COLORS } from '../constants'
import type { HipaaLog } from '../types'

export default function RecentActivityRow({ log: l }: { log: HipaaLog }) {
  const { t1, t2, t3, border } = useApp()
  const accionColor = l.accion.includes('FAILED') ? '#F87171' : l.accion.includes('EXPORT') || l.accion.includes('PRINT') ? '#FBB040' : '#60A5FA'
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ padding: '8px 10px', color: t2, fontFamily: 'DM Mono', fontSize: 10 }}>{new Date(l.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
      <td style={{ padding: '8px 10px', color: t1, fontWeight: 500 }}>{l.usuario_nombre}</td>
      <td style={{ padding: '8px 10px' }}><Badge color={accionColor}>{l.accion}</Badge></td>
      <td style={{ padding: '8px 10px', color: t2 }}>{l.paciente_nombre || '—'}</td>
      <td style={{ padding: '8px 10px', color: t3, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.detalles}</td>
      <td style={{ padding: '8px 10px' }}><Badge color={NIVEL_LOG_COLORS[l.nivel]}>{l.nivel}</Badge></td>
    </tr>
  )
}

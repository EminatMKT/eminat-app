'use client'
import { useApp } from '@/shared/context/AppContext'
import Badge from './Badge'
import { NIVEL_LOG_COLORS } from '../constants'
import type { HipaaLog } from '../types'

function accionColor(accion: string) {
  if (accion.includes('FAILED')) return '#F87171'
  if (accion.includes('EXPORT') || accion.includes('PRINT')) return '#FBB040'
  if (accion.includes('CREATE') || accion.includes('EDIT')) return '#34D399'
  return '#60A5FA'
}

export default function AuditRow({ log: l }: { log: HipaaLog }) {
  const { t1, t2, t3, border } = useApp()
  return (
    <tr style={{ borderBottom: `1px solid ${border}`, background: l.nivel === 'critical' ? 'rgba(248,113,113,0.04)' : 'transparent' }}>
      <td style={{ padding: '10px', fontFamily: 'DM Mono', fontSize: 10, color: t2, whiteSpace: 'nowrap' }}>
        {new Date(l.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </td>
      <td style={{ padding: '10px', color: t1, fontWeight: 500 }}>{l.usuario_nombre}</td>
      <td style={{ padding: '10px' }}><Badge color={accionColor(l.accion)}>{l.accion}</Badge></td>
      <td style={{ padding: '10px', color: t3, fontSize: 10 }}>{l.recurso}</td>
      <td style={{ padding: '10px', color: t2 }}>{l.paciente_nombre || '—'}</td>
      <td style={{ padding: '10px', color: t3, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.detalles}</td>
      <td style={{ padding: '10px', fontFamily: 'DM Mono', fontSize: 10, color: t3 }}>{l.ip}</td>
      <td style={{ padding: '10px' }}>
        <Badge color={NIVEL_LOG_COLORS[l.nivel]}>{l.nivel === 'critical' ? '🔴' : l.nivel === 'warning' ? '🟡' : '🔵'} {l.nivel}</Badge>
      </td>
    </tr>
  )
}

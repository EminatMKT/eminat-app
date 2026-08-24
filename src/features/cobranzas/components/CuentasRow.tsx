'use client'
import { useApp } from '@/shared/context/AppContext'
import { fmt } from '../format'
import type { Cuenta } from '../types'

export default function CuentasRow({ cuenta }: { cuenta: Cuenta }) {
  const { border, t2, t3 } = useApp()
  const td = { padding: '8px 12px' }
  const vencido = Number(cuenta.vencido) || 0
  const porVencer = Number(cuenta.por_vencer) || 0
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ ...td, color: t2 }}>{cuenta.laboratorio}</td>
      <td style={{ ...td, color: t2 }}>{cuenta.estudio}</td>
      <td style={td}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${t3}20`, color: t2 }}>{cuenta.tipo}</span></td>
      <td style={{ ...td, color: '#F87171', fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt(vencido)}</td>
      <td style={{ ...td, color: '#FBB040', fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt(porVencer)}</td>
      <td style={{ ...td, color: '#60A5FA', fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt(vencido + porVencer)}</td>
    </tr>
  )
}

'use client'
import { useApp } from '@/shared/context/AppContext'
import { fmt } from '../format'
import type { Venta } from '../types'
import PeriodBadge from './PeriodBadge'

export default function VentasRow({ venta }: { venta: Venta }) {
  const { border, t2 } = useApp()
  const td = { padding: '8px 12px' }
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ ...td, color: t2 }}>{venta.mes}</td>
      <td style={td}><PeriodBadge periodo={venta.periodo} color1Q="#60A5FA" /></td>
      <td style={{ ...td, color: t2 }}>{venta.laboratorio}</td>
      <td style={{ ...td, color: t2 }}>{venta.estudio}</td>
      <td style={{ ...td, color: '#34D399', fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt(Number(venta.monto) || 0)}</td>
    </tr>
  )
}

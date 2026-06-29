'use client'
import { useApp } from '@/shared/context/AppContext'
import { fmt } from '../format'
import type { Deposito } from '../types'
import PeriodBadge from './PeriodBadge'

export default function DepositosRow({ deposito }: { deposito: Deposito }) {
  const { border, t2, t3 } = useApp()
  const td = { padding: '8px 12px' }
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={td}><PeriodBadge periodo={deposito.periodo} color1Q="#22D3EE" /></td>
      <td style={{ ...td, color: t2 }}>{deposito.contratante}</td>
      <td style={{ ...td, color: t2 }}>{deposito.banco}</td>
      <td style={{ ...td, color: t3, fontFamily: 'DM Mono', fontSize: 11 }}>{deposito.identificacion}</td>
      <td style={{ ...td, color: t2 }}>{deposito.estudio}</td>
      <td style={{ ...td, color: '#34D399', fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt(Number(deposito.depositado) || 0)}</td>
    </tr>
  )
}

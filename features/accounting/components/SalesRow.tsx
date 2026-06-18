import { ACCENT } from '../data'
import { fmt } from '../format'
import { Td, Tr } from './primitives'
import type { Venta } from '../types'

export default function SalesRow({ venta: v }: { venta: Venta }) {
  return (
    <Tr>
      <Td>{v.mes}</Td>
      <Td color={ACCENT.teal} mono bold>{v.periodo}</Td>
      <Td bold>{v.lab}</Td>
      <Td color="#6b7280">{v.estudio}</Td>
      <Td align="right" mono color={v.monto > 0 ? '#111827' : '#9ca3af'}>{fmt(v.monto)}</Td>
    </Tr>
  )
}

import { ACCENT } from '../data'
import { fmt } from '../format'
import Td from './Td'
import Tr from './Tr'
import type { Venta } from '../types'

export default function SalesRow({ venta: v }: { venta: Venta }) {
  return (
    <Tr>
      <Td>{v.mes}</Td>
      <Td color={ACCENT.teal} mono bold>{v.periodo}</Td>
      <Td bold>{v.lab}</Td>
      <Td color="var(--c-t2)">{v.estudio}</Td>
      <Td align="right" mono color={v.monto > 0 ? 'var(--c-t1)' : 'var(--c-t3)'}>{fmt(v.monto)}</Td>
    </Tr>
  )
}

import { ACCENT } from '../data'
import { fmt } from '../format'
import Td from './Td'
import Tr from './Tr'
import type { Deposito } from '../types'

export default function DepositRow({ deposito: d }: { deposito: Deposito }) {
  return (
    <Tr>
      <Td mono bold>{d.dia}</Td>
      <Td color={ACCENT.teal} mono>{d.periodo}</Td>
      <Td>{d.contratante}</Td>
      <Td bold>{d.lab}</Td>
      <Td color="#6b7280">{d.estudio}</Td>
      <Td>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${ACCENT.purple}1f`, color: ACCENT.purple }}>{d.banco}</span>
      </Td>
      <Td align="right" mono bold color={ACCENT.green}>{fmt(d.monto)}</Td>
    </Tr>
  )
}

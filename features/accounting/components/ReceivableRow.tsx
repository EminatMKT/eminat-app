import { ACCENT } from '../data'
import { fmt } from '../format'
import { Td, Tr } from './primitives'
import type { PorCobrar } from '../types'

export default function ReceivableRow({ row: p }: { row: PorCobrar }) {
  return (
    <Tr>
      <Td bold>{p.lab}</Td>
      <Td color="#6b7280">{p.estudio}</Td>
      <Td>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{
          background: p.tipo === 'DATA' ? `${ACCENT.teal}1f` : `${ACCENT.purple}1f`,
          color: p.tipo === 'DATA' ? ACCENT.teal : ACCENT.purple,
        }}>{p.tipo}</span>
      </Td>
      <Td mono>{p.periodo}</Td>
      <Td align="right" mono color={p.vencido > 0 ? ACCENT.red : '#9ca3af'}>{fmt(p.vencido)}</Td>
      <Td align="right" mono color={p.porVencer > 0 ? '#b45309' : '#9ca3af'}>{fmt(p.porVencer)}</Td>
      <Td align="right" mono bold>{fmt(p.total)}</Td>
    </Tr>
  )
}

import { ACCENT } from '../data'
import { fmt } from '../format'
import Td from './Td'
import Tr from './Tr'
import type { PorCobrar } from '../types'
import s from './ReceivableRow.module.css'

export default function ReceivableRow({ row: p }: { row: PorCobrar }) {
  return (
    <Tr>
      <Td bold>{p.lab}</Td>
      <Td color="var(--c-t2)">{p.estudio}</Td>
      <Td>
        <span className={s.badge} style={{
          background: p.tipo === 'DATA' ? `${ACCENT.teal}1f` : `${ACCENT.purple}1f`,
          color: p.tipo === 'DATA' ? ACCENT.teal : ACCENT.purple,
        }}>{p.tipo}</span>
      </Td>
      <Td mono>{p.periodo}</Td>
      <Td align="right" mono color={p.vencido > 0 ? ACCENT.red : 'var(--c-t3)'}>{fmt(p.vencido)}</Td>
      <Td align="right" mono color={p.porVencer > 0 ? 'var(--c-warn-solid)' : 'var(--c-t3)'}>{fmt(p.porVencer)}</Td>
      <Td align="right" mono bold>{fmt(p.total)}</Td>
    </Tr>
  )
}

import { ACCENT } from '../data'
import { fmt } from '../format'
import Td from './Td'
import Tr from './Tr'
import type { LabStat } from '../types'
import css from './LabRow.module.css'

export default function LabRow({ lab, stat: s, maxV }: { lab: string; stat: LabStat; maxV: number }) {
  const pct = maxV > 0 ? (s.ventas / maxV) * 100 : 0
  return (
    <Tr>
      <Td bold>{lab}</Td>
      <Td align="right" mono color={ACCENT.purple}>{fmt(s.ventas)}</Td>
      <Td align="right" mono color={ACCENT.teal}>{fmt(s.cobrar)}</Td>
      <Td align="right" mono color={ACCENT.green}>{fmt(s.depositado)}</Td>
      <Td>
        <div className={css.track}>
          <div className={css.fill} style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${ACCENT.purple}, ${ACCENT.teal})` }} />
        </div>
      </Td>
    </Tr>
  )
}

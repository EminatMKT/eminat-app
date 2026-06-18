import { ACCENT } from '../data'
import { fmt } from '../format'
import { Td, Tr } from './primitives'
import type { LabStat } from '../types'

export default function LabRow({ lab, stat: s, maxV }: { lab: string; stat: LabStat; maxV: number }) {
  const pct = maxV > 0 ? (s.ventas / maxV) * 100 : 0
  return (
    <Tr>
      <Td bold>{lab}</Td>
      <Td align="right" mono color={ACCENT.purple}>{fmt(s.ventas)}</Td>
      <Td align="right" mono color={ACCENT.teal}>{fmt(s.cobrar)}</Td>
      <Td align="right" mono color={ACCENT.green}>{fmt(s.depositado)}</Td>
      <Td>
        <div className="h-1.5 min-w-[120px] overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${ACCENT.purple}, ${ACCENT.teal})` }} />
        </div>
      </Td>
    </Tr>
  )
}

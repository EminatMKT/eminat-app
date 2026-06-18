import { ACCENT } from '../data'
import { labStats } from '../aggregates'
import { fmt } from '../format'
import { Card, TableWrap, Th, Td, Tr } from './primitives'

export default function LabsTab() {
  const maxV = Math.max(...labStats.map(x => x[1].ventas))
  return (
    <Card title="Laboratory Performance" subtitle="Sales · Receivables · Deposits per lab">
      <TableWrap>
        <thead><tr><Th>Lab</Th><Th align="right">Sales</Th><Th align="right">Receivables</Th><Th align="right">Deposits</Th><Th>Performance</Th></tr></thead>
        <tbody>
          {labStats.map(([lab, s]) => {
            const pct = maxV > 0 ? (s.ventas / maxV) * 100 : 0
            return (
              <Tr key={lab}>
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
          })}
        </tbody>
      </TableWrap>
    </Card>
  )
}

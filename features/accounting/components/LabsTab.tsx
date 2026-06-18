import { labStats } from '../aggregates'
import SectionCard from './SectionCard'
import TableWrap from './TableWrap'
import Th from './Th'
import LabRow from './LabRow'

export default function LabsTab() {
  const maxV = Math.max(...labStats.map(x => x[1].ventas))
  return (
    <SectionCard title="Laboratory Performance" subtitle="Sales · Receivables · Deposits per lab">
      <TableWrap>
        <thead><tr><Th>Lab</Th><Th align="right">Sales</Th><Th align="right">Receivables</Th><Th align="right">Deposits</Th><Th>Performance</Th></tr></thead>
        <tbody>
          {labStats.map(([lab, s]) => <LabRow key={lab} lab={lab} stat={s} maxV={maxV} />)}
        </tbody>
      </TableWrap>
    </SectionCard>
  )
}

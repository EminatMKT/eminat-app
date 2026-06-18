'use client'
import { useState } from 'react'
import { ventas, ACCENT } from '../data'
import { fmt } from '../format'
import SectionCard from './SectionCard'
import FilterBtn from './FilterBtn'
import TableWrap from './TableWrap'
import Th from './Th'
import Td from './Td'
import SalesRow from './SalesRow'

export default function SalesTab() {
  const [periodo, setPeriodo] = useState<'all' | '1Q' | '2Q'>('all')
  const filtered = ventas.filter(v => periodo === 'all' || v.periodo === periodo)
  const total = filtered.reduce((a, b) => a + b.monto, 0)
  return (
    <SectionCard title="Sales — March" subtitle={`${filtered.length} records · ${fmt(total)}`}>
      <div className="mb-3 flex gap-1.5">
        {(['all', '1Q', '2Q'] as const).map(p => (
          <FilterBtn key={p} active={periodo === p} color={ACCENT.purple} onClick={() => setPeriodo(p)}>
            {p === 'all' ? 'All' : p}
          </FilterBtn>
        ))}
      </div>
      <TableWrap>
        <thead><tr><Th>Month</Th><Th>Period</Th><Th>Lab</Th><Th>Study</Th><Th align="right">Amount</Th></tr></thead>
        <tbody>
          {filtered.map((v, i) => <SalesRow key={i} venta={v} />)}
          <tr className="bg-gray-50">
            <Td bold>TOTAL</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
            <Td align="right" mono bold color={ACCENT.purple}>{fmt(total)}</Td>
          </tr>
        </tbody>
      </TableWrap>
    </SectionCard>
  )
}

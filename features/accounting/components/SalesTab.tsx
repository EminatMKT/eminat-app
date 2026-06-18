'use client'
import { useState } from 'react'
import { ventas, ACCENT } from '../data'
import { fmt } from '../format'
import { Card, FilterBtn, TableWrap, Th, Td, Tr } from './primitives'

export default function SalesTab() {
  const [periodo, setPeriodo] = useState<'all' | '1Q' | '2Q'>('all')
  const filtered = ventas.filter(v => periodo === 'all' || v.periodo === periodo)
  const total = filtered.reduce((a, b) => a + b.monto, 0)
  return (
    <Card title="Sales — March" subtitle={`${filtered.length} records · ${fmt(total)}`}>
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
          {filtered.map((v, i) => (
            <Tr key={i}>
              <Td>{v.mes}</Td>
              <Td color={ACCENT.teal} mono bold>{v.periodo}</Td>
              <Td bold>{v.lab}</Td>
              <Td color="#6b7280">{v.estudio}</Td>
              <Td align="right" mono color={v.monto > 0 ? '#111827' : '#9ca3af'}>{fmt(v.monto)}</Td>
            </Tr>
          ))}
          <tr className="bg-gray-50">
            <Td bold>TOTAL</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
            <Td align="right" mono bold color={ACCENT.purple}>{fmt(total)}</Td>
          </tr>
        </tbody>
      </TableWrap>
    </Card>
  )
}

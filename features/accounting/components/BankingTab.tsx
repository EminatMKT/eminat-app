'use client'
import { useState } from 'react'
import { depositos, ACCENT } from '../data'
import { fmt } from '../format'
import { Card, FilterBtn, TableWrap, Th, Td, Tr } from './primitives'

export default function BankingTab() {
  const [banco, setBanco] = useState<'all' | 'SOUTH STATE' | 'SPACE COAST'>('all')
  const filtered = depositos.filter(d => banco === 'all' || d.banco === banco)
  const total = filtered.reduce((a, b) => a + b.monto, 0)
  return (
    <Card title="Bank Deposits — March" subtitle={`${filtered.length} deposits · ${fmt(total)}`}>
      <div className="mb-3 flex gap-1.5">
        {(['all', 'SOUTH STATE', 'SPACE COAST'] as const).map(b => (
          <FilterBtn key={b} active={banco === b} color={ACCENT.teal} onClick={() => setBanco(b)}>
            {b === 'all' ? 'All Banks' : b}
          </FilterBtn>
        ))}
      </div>
      <TableWrap>
        <thead><tr><Th>Day</Th><Th>Period</Th><Th>Payer</Th><Th>Lab</Th><Th>Study</Th><Th>Bank</Th><Th align="right">Amount</Th></tr></thead>
        <tbody>
          {filtered.map((d, i) => (
            <Tr key={i}>
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
          ))}
          <tr className="bg-gray-50">
            <Td bold>TOTAL</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
            <Td align="right" mono bold color={ACCENT.green}>{fmt(total)}</Td>
          </tr>
        </tbody>
      </TableWrap>
    </Card>
  )
}

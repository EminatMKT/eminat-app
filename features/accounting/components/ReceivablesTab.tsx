'use client'
import { useState } from 'react'
import { porCobrar, ACCENT } from '../data'
import { fmt } from '../format'
import Card from './Card'
import FilterBtn from './FilterBtn'
import TableWrap from './TableWrap'
import Th from './Th'
import Td from './Td'
import ReceivableRow from './ReceivableRow'

export default function ReceivablesTab() {
  const [tipo, setTipo] = useState<'all' | 'DATA' | 'INVOICE'>('all')
  const filtered = porCobrar.filter(p => tipo === 'all' || p.tipo === tipo)
  const totV = filtered.reduce((a, b) => a + b.vencido, 0)
  const totPV = filtered.reduce((a, b) => a + b.porVencer, 0)
  const totT = filtered.reduce((a, b) => a + b.total, 0)
  return (
    <Card title="Receivables" subtitle={`${filtered.length} records · ${fmt(totT)} outstanding`}>
      <div className="mb-3 flex gap-1.5">
        {(['all', 'DATA', 'INVOICE'] as const).map(t => (
          <FilterBtn key={t} active={tipo === t} color={ACCENT.teal} onClick={() => setTipo(t)}>
            {t === 'all' ? 'All' : t}
          </FilterBtn>
        ))}
      </div>
      <TableWrap>
        <thead><tr><Th>Lab</Th><Th>Study</Th><Th>Type</Th><Th>Period</Th><Th align="right">Overdue</Th><Th align="right">Not Due</Th><Th align="right">Total</Th></tr></thead>
        <tbody>
          {filtered.map((p, i) => <ReceivableRow key={i} row={p} />)}
          <tr className="bg-gray-50">
            <Td bold>TOTAL</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
            <Td align="right" mono bold color={ACCENT.red}>{fmt(totV)}</Td>
            <Td align="right" mono bold color="#b45309">{fmt(totPV)}</Td>
            <Td align="right" mono bold color={ACCENT.teal}>{fmt(totT)}</Td>
          </tr>
        </tbody>
      </TableWrap>
    </Card>
  )
}

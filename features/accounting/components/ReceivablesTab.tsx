'use client'
import { useState } from 'react'
import { porCobrar, ACCENT } from '../data'
import { fmt } from '../format'
import { Card, FilterBtn, TableWrap, Th, Td, Tr } from './primitives'

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
          {filtered.map((p, i) => (
            <Tr key={i}>
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
          ))}
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

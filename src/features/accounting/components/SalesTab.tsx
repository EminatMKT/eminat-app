'use client'
import { useState } from 'react'
import { SIN_FILTRO } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { ventas, ACCENT } from '../data'
import { fmt } from '../format'
import SectionCard from './SectionCard'
import FilterBtn from './FilterBtn'
import TableWrap from './TableWrap'
import Th from './Th'
import Td from './Td'
import SalesRow from './SalesRow'

export default function SalesTab() {
  const { t: tr } = useT()
  const [periodo, setPeriodo] = useState<typeof SIN_FILTRO | '1Q' | '2Q'>(SIN_FILTRO)
  const filtered = ventas.filter(v => periodo === SIN_FILTRO || v.periodo === periodo)
  const total = filtered.reduce((a, b) => a + b.monto, 0)
  return (
    <SectionCard title="Sales — March" subtitle={`${filtered.length} records · ${fmt(total)}`}>
      <div className="mb-3 flex gap-1.5">
        {([SIN_FILTRO, '1Q', '2Q'] as const).map(p => (
          <FilterBtn key={p} active={periodo === p} color={ACCENT.purple} onClick={() => setPeriodo(p)}>
            {p === SIN_FILTRO ? tr('common.all') : p}
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

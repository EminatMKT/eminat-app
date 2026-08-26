'use client'
import { useState } from 'react'
import { SIN_FILTRO } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { depositos, ACCENT } from '../data'
import { fmt } from '../format'
import SectionCard from './SectionCard'
import FilterBtn from './FilterBtn'
import TableWrap from './TableWrap'
import Th from './Th'
import Td from './Td'
import DepositRow from './DepositRow'

export default function BankingTab() {
  const { t: tr } = useT()
  const [banco, setBanco] = useState<typeof SIN_FILTRO | 'SOUTH STATE' | 'SPACE COAST'>(SIN_FILTRO)
  const filtered = depositos.filter(d => banco === SIN_FILTRO || d.banco === banco)
  const total = filtered.reduce((a, b) => a + b.monto, 0)
  return (
    <SectionCard title="Bank Deposits — March" subtitle={`${filtered.length} deposits · ${fmt(total)}`}>
      <div className="mb-3 flex gap-1.5">
        {([SIN_FILTRO, 'SOUTH STATE', 'SPACE COAST'] as const).map(b => (
          <FilterBtn key={b} active={banco === b} color={ACCENT.teal} onClick={() => setBanco(b)}>
            {b === SIN_FILTRO ? tr('common.all') : b}
          </FilterBtn>
        ))}
      </div>
      <TableWrap>
        <thead><tr><Th>Day</Th><Th>Period</Th><Th>Payer</Th><Th>Lab</Th><Th>Study</Th><Th>Bank</Th><Th align="right">Amount</Th></tr></thead>
        <tbody>
          {filtered.map((d, i) => <DepositRow key={i} deposito={d} />)}
          <tr className="bg-gray-50">
            <Td bold>TOTAL</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
            <Td align="right" mono bold color={ACCENT.green}>{fmt(total)}</Td>
          </tr>
        </tbody>
      </TableWrap>
    </SectionCard>
  )
}

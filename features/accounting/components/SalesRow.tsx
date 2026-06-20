'use client'
import { useApp } from '@/shared/context/AppContext'
import { ACCENT } from '../data'
import { fmt } from '../format'
import Td from './Td'
import Tr from './Tr'
import type { Venta } from '../types'

export default function SalesRow({ venta: v }: { venta: Venta }) {
  const { t1, t2, t3 } = useApp()
  return (
    <Tr>
      <Td>{v.mes}</Td>
      <Td color={ACCENT.teal} mono bold>{v.periodo}</Td>
      <Td bold>{v.lab}</Td>
      <Td color={t2}>{v.estudio}</Td>
      <Td align="right" mono color={v.monto > 0 ? t1 : t3}>{fmt(v.monto)}</Td>
    </Tr>
  )
}

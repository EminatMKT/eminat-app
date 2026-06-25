'use client'
import { MARCAS_LIST } from '@/shared/context/AppContext'
import BrandChip from './BrandChip'

// Chips de las marcas del grupo en el topbar.
export default function TopbarBrands() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {MARCAS_LIST.map(m => <BrandChip key={m.codigo} codigo={m.codigo} color={m.color} />)}
    </div>
  )
}

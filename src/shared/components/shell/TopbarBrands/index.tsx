'use client'
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import BrandChip from '@/shared/components/ui/BrandChip'

// Chips de las marcas del grupo en el topbar.
export default function TopbarBrands() {
  const { marcas } = useApp()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {marcas.map(m => <BrandChip key={m.codigo} codigo={m.codigo} color={m.color ?? COLOR_MARCA_FALLBACK} />)}
    </div>
  )
}

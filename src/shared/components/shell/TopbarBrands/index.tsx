'use client'
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { ColorBadge } from '@/shared/components/ui'

// Las marcas del grupo en el topbar. Son etiquetas que se LEEN: no se clickean, no filtran nada.
// Por eso usan `ColorBadge` —la etiqueta teñida compartida— y no un chip propio: `BrandChip` era
// un punto de color más el código, con el mismo look que los chips que sí se eligen, así que la
// app prometía interacción donde no la hay. De paso hereda su contraste medido: el color crudo de
// una marca daba hasta 1.84:1 sobre el fondo teñido, y ColorBadge lo mezcla al 50% con el texto
// de la app para llegar a 5.12:1.
export default function TopbarBrands() {
  const { marcas } = useApp()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {marcas.map(m => <ColorBadge key={m.codigo} color={m.color ?? COLOR_MARCA_FALLBACK}>{m.codigo}</ColorBadge>)}
    </div>
  )
}

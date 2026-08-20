'use client'
import ColorBadge from '@/shared/components/ui/ColorBadge'
import { fNum } from '@/features/stratix-mkt/utils/comp-format'
import { TENDENCIA_COLORS, TENDENCIA_ICONS } from '@/features/stratix-mkt/data'
import type { Competitor } from '@/features/stratix-mkt/data'
import ComparisonBar from '../ComparisonBar'

// La barra de un competidor: la forma la pone ComparisonBar, el dominio —color y etiqueta de
// tendencia— lo pone este.
type Props = {
  c: Competitor
  maxIG: number
}

export default function CompetitorComparisonBar({ c, maxIG }: Props) {
  const color = TENDENCIA_COLORS[c.tendencia]
  return (
    <ComparisonBar nombre={c.name} pct={(c.igFollowers / maxIG) * 100} valor={fNum(c.igFollowers)} relleno={color}
      right={<ColorBadge color={color}>{TENDENCIA_ICONS[c.tendencia]} {c.tendencia}</ColorBadge>} />
  )
}

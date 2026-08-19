'use client'
import { RESEARCH_THEME } from '../theme'
import { PIPELINE_COLORS, stageLabel } from '../constants'
import { useT } from '@/shared/i18n'

// Badge de stage del pipeline (color por stage, texto traducido).
export default function StageBadge({ stage }: { stage?: string }) {
  const { t3 } = RESEARCH_THEME
  const { t } = useT()
  // Gris deliberado para un valor legacy: en la tabla el badge no distingue etapas entre sí
  // (para eso está el texto), señala "esta etapa no es del pipeline actual". Por eso NO usa
  // stageColors, que es del pie y su leyenda.
  const color = PIPELINE_COLORS[stage || ''] || t3
  return (
    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${color}20`, color, fontWeight: 600, whiteSpace: 'nowrap' }}>{stageLabel(stage, t)}</span>
  )
}

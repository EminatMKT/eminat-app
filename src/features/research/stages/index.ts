import type { I18nKey } from '@/shared/i18n'
import { CHART_COLORS } from '@/shared/components/dashboard/theme'
import type { Stage, StageMeta } from '../types'

export const STAGE = {
  NUEVO: 'Nuevo',
  CONTACTADO: 'Contactado',
  EN_COMUNICACION: 'En comunicación',
  GANADO: 'Ganado',
  SIN_RESPUESTA: 'Sin respuesta',
} satisfies Record<string, Stage>

const STAGE_META = {
  [STAGE.NUEVO]: { labelKey: 'research.stage.nuevo', color: '#60A5FA' },
  [STAGE.CONTACTADO]: { labelKey: 'research.stage.contactado', color: '#FBB040' },
  [STAGE.EN_COMUNICACION]: { labelKey: 'research.stage.en_comunicacion', color: '#A78BFA' },
  [STAGE.GANADO]: { labelKey: 'research.stage.ganado', color: '#34D399' },
  [STAGE.SIN_RESPUESTA]: { labelKey: 'research.stage.sin_respuesta', color: '#9494B3' },
} satisfies Record<Stage, StageMeta>

const STAGE_ENTRIES = Object.entries(STAGE_META) as [Stage, StageMeta][]

export const PIPELINE_COLS = STAGE_ENTRIES.map(([s]) => s)
export const STAGE_LABEL_KEY = Object.fromEntries(STAGE_ENTRIES.map(([s, m]) => [s, m.labelKey])) as Record<Stage, I18nKey>
export const PIPELINE_COLORS = Object.fromEntries(STAGE_ENTRIES.map(([s, m]) => [s, m.color])) as Record<Stage, string>
export const ARCHIVED_STAGE: Stage = STAGE.SIN_RESPUESTA
export const PIPELINE_ACTIVE_COLS = PIPELINE_COLS.filter(s => s !== ARCHIVED_STAGE)
export const DEFAULT_STAGE: Stage = PIPELINE_COLS[0]

export function stageLabel(stage: string | undefined, t: (k: I18nKey) => string): string {
  const key = (STAGE_LABEL_KEY as Record<string, I18nKey>)[stage ?? '']
  return key ? t(key) : (stage || '—')
}

const CANONICAL_STAGES = new Set<string>(Object.keys(PIPELINE_COLORS))
const PIPELINE_HEXES = new Set<string>(Object.values(PIPELINE_COLORS))
const EXTRA_COLORS = CHART_COLORS.filter(c => !PIPELINE_HEXES.has(c))

export function stageColors(names: string[]): Record<string, string> {
  const legacy = Array.from(new Set(names)).filter(n => !CANONICAL_STAGES.has(n)).sort()
  return Object.fromEntries(names.map(n => [n, CANONICAL_STAGES.has(n)
    ? (PIPELINE_COLORS as Record<string, string>)[n]
    : legacyColor(legacy.indexOf(n))]))
}

function legacyColor(i: number): string {
  return i < EXTRA_COLORS.length ? EXTRA_COLORS[i] : `hsl(${(i * 137.5) % 360} 62% 62%)`
}

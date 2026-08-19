import type { I18nKey } from '@/shared/i18n'
import type { Stage, StageMeta } from './types'

// ÚNICO lugar con los literales canónicos de las etapas (columna research_leads.stage).
// Referencias nombradas: se usan en lógica en vez de strings mágicos (ej. `l.stage === STAGE.GANADO`)
// Y como keys de STAGE_META (abajo) → los literales no se repiten. `satisfies Record<string, Stage>`
// ata los valores al tipo `Stage` (types.ts): un typo o una etapa que no existe en Stage = error de tsc.
export const STAGE = {
  NUEVO: 'Nuevo',
  CONTACTADO: 'Contactado',
  GANADO: 'Ganado',
  SIN_RESPUESTA: 'Sin respuesta',
} satisfies Record<string, Stage>

// FUENTE ÚNICA de DATOS por etapa (clave i18n de display + color), EN ORDEN de pipeline. Keyed por
// STAGE.* (no repite literales). `satisfies Record<Stage, StageMeta>` exige EXACTAMENTE las etapas
// de `Stage`, completas → si falta/sobra una, o una entrada no tiene labelKey o color, = error de
// tsc. Todo lo demás (PIPELINE_COLS, STAGE_LABEL_KEY, PIPELINE_COLORS, default) deriva de acá.
const STAGE_META = {
  [STAGE.NUEVO]:         { labelKey: 'research.stage.nuevo',         color: '#60A5FA' },
  [STAGE.CONTACTADO]:    { labelKey: 'research.stage.contactado',    color: '#FBB040' },
  [STAGE.GANADO]:        { labelKey: 'research.stage.ganado',        color: '#34D399' },
  [STAGE.SIN_RESPUESTA]: { labelKey: 'research.stage.sin_respuesta', color: '#9494B3' },
} satisfies Record<Stage, StageMeta>

const STAGE_ENTRIES = Object.entries(STAGE_META) as [Stage, StageMeta][]

// Derivados del mapa (orden del pipeline = orden de inserción de las keys).
export const PIPELINE_COLS = STAGE_ENTRIES.map(([s]) => s)
export const STAGE_LABEL_KEY = Object.fromEntries(STAGE_ENTRIES.map(([s, m]) => [s, m.labelKey])) as Record<Stage, I18nKey>
export const PIPELINE_COLORS = Object.fromEntries(STAGE_ENTRIES.map(([s, m]) => [s, m.color])) as Record<Stage, string>

// 'Sin respuesta' = archivado: no ocupa columna en el Kanban.
export const ARCHIVED_STAGE: Stage = STAGE.SIN_RESPUESTA
export const PIPELINE_ACTIVE_COLS = PIPELINE_COLS.filter(s => s !== ARCHIVED_STAGE)

// Etapa por defecto de un lead nuevo (form e import con celda vacía) = primera del pipeline.
export const DEFAULT_STAGE: Stage = PIPELINE_COLS[0]

// Etiqueta traducida de una etapa; cae al literal crudo si no hay clave (valores legacy sin migrar).
export function stageLabel(stage: string | undefined, t: (k: I18nKey) => string): string {
  const key = (STAGE_LABEL_KEY as Record<string, I18nKey>)[stage ?? '']
  return key ? t(key) : (stage || '—')
}

export const CHART_COLORS = ['#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FBB040', '#F87171', '#7C6FF7', '#FB923C', '#22D3EE', '#9494B3']

// Colores del pie de etapas y su leyenda, resueltos DE UNA VEZ para todo el gráfico. Antes cada
// uno resolvía el suyo (el pie caía a CHART_COLORS[i], la leyenda a `accent`) y el mismo dato
// salía naranja en el gráfico y violeta en la leyenda. Además CHART_COLORS repite hexes del
// pipeline (#FBB040 ES el de Contactado), así que una etapa legacy podía competir con una
// canónica. Se resuelve por conjunto y no nombre por nombre: es lo que permite garantizar que
// dos etapas distintas del MISMO gráfico nunca compartan color, incluso pasadas las 6 de la
// paleta fija (el CHECK todavía admite 9 legacy + el balde 'Sin etapa' = 10 posibles).
const CANONICAL_STAGES = new Set<string>(Object.keys(PIPELINE_COLORS))
const PIPELINE_HEXES = new Set<string>(Object.values(PIPELINE_COLORS))
const EXTRA_COLORS = CHART_COLORS.filter(c => !PIPELINE_HEXES.has(c))

export function stageColors(names: string[]): Record<string, string> {
  // Orden ALFABÉTICO de las legacy presentes, no el del gráfico: stageData viene ordenado por
  // cantidad, así que con un índice posicional el color de una etapa cambiaría al cargar un lead.
  // Con el orden por nombre, el color solo se mueve si aparece o desaparece un valor legacy.
  const legacy = Array.from(new Set(names)).filter(n => !CANONICAL_STAGES.has(n)).sort()
  return Object.fromEntries(names.map(n => [n, CANONICAL_STAGES.has(n)
    ? (PIPELINE_COLORS as Record<string, string>)[n]
    : legacyColor(legacy.indexOf(n))]))
}

// Pasada la paleta fija se generan colores por ángulo áureo en vez de dar la vuelta con un
// módulo: repetir era lo que hacía que dos porciones salieran iguales, y justamente las de la
// cola son las más chicas — quedan bajo el 5% que necesita etiqueta, así que el color es el
// ÚNICO dato que las identifica.
function legacyColor(i: number): string {
  return i < EXTRA_COLORS.length ? EXTRA_COLORS[i] : `hsl(${(i * 137.5) % 360} 62% 62%)`
}

// ponytail: sin uso tras comentar "Leads by Country" (dirección, reunión 2026-07-20). Su único
// consumidor era CountryChip.tsx, hoy comentado. No borrar — restaurar junto con ese bloque.
/*
export const COUNTRY_FLAGS: Record<string, string> = {
  'United States': '🇺🇸', 'USA': '🇺🇸', 'US': '🇺🇸', 'Spain': '🇪🇸', 'Germany': '🇩🇪', 'France': '🇫🇷', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧',
  'Italy': '🇮🇹', 'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Japan': '🇯🇵', 'China': '🇨🇳', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽', 'India': '🇮🇳',
  'Argentina': '🇦🇷', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Ecuador': '🇪🇨', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰',
  'Finland': '🇫🇮', 'Ireland': '🇮🇪', 'Israel': '🇮🇱', 'South Korea': '🇰🇷', 'Turkey': '🇹🇷', 'Russia': '🇷🇺', 'South Africa': '🇿🇦',
  'New Zealand': '🇳🇿', 'Greece': '🇬🇷', 'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Taiwan': '🇹🇼',
}
*/

// Columnas congeladas de la tabla de leads: las dos primeras (NCT# y título), que son las que
// dicen DE QUÉ ESTUDIO es la fila. Sin esto, al desplazarse a la derecha se ven fase, sponsor y
// etapa de una fila que ya no se sabe cuál es.
// El ancho vive acá y no en cada componente porque `left` de la segunda ES el ancho de la
// primera: si la cabecera y la fila usan números distintos, las columnas se solapan.
// `position: sticky` solo pega al borde izquierdo, así que estas dos TIENEN que ser las
// primeras de la tabla — de ahí el orden de COLUMNS en LeadsTab.
export const FROZEN_COLS = [{ width: 118, left: 0 }, { width: 240, left: 118 }] as const

// Los campos de un lead (form/export/import/validación) viven en ./utils/fields.ts.

// — NCT# (identificador del estudio en ClinicalTrials.gov) — fuente única, no repetir literales.
export const NCT_COLUMN = 'nct_number'
// — Contador de intentos de contacto (correos enviados a ese estudio) — fuente única.
export const COUNT_COLUMN = 'email_count'
export const TITLE_COLUMN = 'official_title' // se usa para buscar el estudio por título en CT.gov
export const NCT_RE = /^NCT\d{8}$/i
export const CLINICAL_TRIALS_BASE = 'https://clinicaltrials.gov'
// Normaliza un NCT# para comparar/indexar/consultar: sin espacios, en mayúsculas.
export const normNct = (v: unknown) => String(v ?? '').trim().toUpperCase()

export const MAIL_ESTADO_COLOR: Record<string, string> = { Borrador: '#9CA3AF', Programado: '#60A5FA', Enviado: '#34D399', Cancelado: '#F87171' }

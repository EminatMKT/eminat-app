// Filas de Supabase (research_leads/activities/campaigns). Campos dinámicos →
// tipamos los conocidos y dejamos índice abierto para el resto.
import type { I18nKey } from '@/shared/i18n'
import type { Specialty } from './utils/specialty'

// — Etapas propias del CRM (columna research_leads.stage) —
// Union canónica: los valores EXACTOS que se guardan (la migración manual mapea a estos).
// El mapa de datos `STAGE_META` (constants.ts) se valida `satisfies Record<Stage, StageMeta>`
// → si allá falta o sobra una etapa, es error de tsc (no pueden desincronizarse).
export type Stage = 'Nuevo' | 'Contactado' | 'Ganado' | 'Sin respuesta'

// Metadata de display por etapa (clave i18n + color). El DATO vive en constants.ts (STAGE_META).
export type StageMeta = { labelKey: I18nKey; color: string }

// Valor que puede tener la columna `stage`: una etapa canónica (con autocomplete) O un string
// legacy sin migrar. El `& {}` preserva las sugerencias del union sin cerrar el tipo — la DB
// puede tener valores viejos durante la transición (la migración de datos es manual).
export type StageValue = Stage | (string & {})

export interface Lead {
  id: string
  date_added?: string
  nct_number?: string
  official_title?: string
  conditions?: string
  // Especialidad médica (dominio cerrado, ver utils/specialty.ts). Se deriva del MeSH de
  // CT.gov o la elige una persona. undefined/null = sin clasificar, distinto de 'Otras'.
  especialidad?: Specialty | null
  brief_explanation?: string
  phase?: string | number
  study_type?: string
  recruitment_status?: string
  study_start_date?: string
  primary_completion_date?: string
  countries?: string
  spain_focus?: boolean
  record_link?: string
  lead_sponsor?: string
  sponsor_type?: string
  contact_name?: string
  contact_role?: string
  contact_email?: string
  contact_phone?: string
  contact_source?: string
  contact2_name?: string
  contact2_role?: string
  contact2_email?: string
  contact2_phone?: string
  stage?: StageValue
  // Intentos de contacto registrados (correos enviados a ese estudio). null = todavía ninguno
  // registrado, que NO es lo mismo que 0 — el import respeta esa diferencia.
  email_count?: number | null
  next_followup_date?: string
  email_date?: string
  notes?: string
  internal_note?: string
  valor_estimado?: string | number
  [key: string]: unknown
}

export interface Activity {
  id: string
  lead_id: string
  tipo: string
  nota: string
  fecha: string
  [key: string]: unknown
}

export interface Campaign {
  id: string
  nombre?: string
  asunto?: string
  contenido?: string
  tipo?: string
  estado?: string
  total_enviados?: number
  total_abiertos?: number
  total_clicks?: number
  fecha_envio?: string
  created_at?: string
  [key: string]: unknown
}

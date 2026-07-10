// Fuente de verdad de los campos de un lead de Research.
//
// `column` es la columna REAL de research_leads (lo que se guarda/lee). De acá derivan
// el form (input por tipo + validación), saveLead, y export/import. Reemplaza los
// LEAD_FIELDS / FIELD_LABELS / CSV_COLUMN_MAP sueltos, que usaban nombres amigables
// distintos de las columnas y rompían el guardado, la edición, el detalle y el import.
// Las etiquetas y mensajes son claves i18n (ver shared/i18n) — nada de texto hardcodeado.
import { PIPELINE_COLS, NCT_COLUMN } from './constants'
import type { I18nKey } from '@/shared/i18n'

export type LeadFieldType = 'text' | 'email' | 'tel' | 'url' | 'date' | 'textarea' | 'select' | 'datalist' | 'checkbox'
export type LeadFieldGroup = 'Estudio' | 'Contacto' | 'Seguimiento'

export interface LeadFieldDef {
  column: string
  labelKey: I18nKey
  type: LeadFieldType
  group: LeadFieldGroup
  fullWidth?: boolean
  required?: boolean
  options?: string[] // select / datalist
}

// Sugerencias (datalist) — admiten valor libre para no romper data existente (ej. phase="2").
const PHASES = ['Early Phase 1', 'Phase 1', 'Phase 1/Phase 2', 'Phase 2', 'Phase 2/Phase 3', 'Phase 3', 'Phase 4', 'N/A']
const STATUSES = ['Recruiting', 'Not yet recruiting', 'Enrolling by invitation', 'Active, not recruiting', 'Completed', 'Suspended', 'Terminated', 'Withdrawn', 'Unknown status']
const STUDY_TYPES = ['Interventional', 'Observational'] // dominio cerrado -> select estricto

export const LEAD_GROUPS: LeadFieldGroup[] = ['Estudio', 'Contacto', 'Seguimiento']
export const GROUP_LABEL_KEY: Record<LeadFieldGroup, I18nKey> = {
  Estudio: 'research.group.estudio',
  Contacto: 'research.group.contacto',
  Seguimiento: 'research.group.seguimiento',
}

export const LEAD_FIELD_DEFS: LeadFieldDef[] = [
  // — Estudio —
  { column: 'date_added', labelKey: 'research.field.date_added', type: 'date', group: 'Estudio' },
  { column: NCT_COLUMN, labelKey: 'research.field.nct_number', type: 'text', group: 'Estudio' },
  { column: 'official_title', labelKey: 'research.field.official_title', type: 'text', group: 'Estudio', fullWidth: true, required: true },
  { column: 'conditions', labelKey: 'research.field.conditions', type: 'text', group: 'Estudio' },
  { column: 'brief_explanation', labelKey: 'research.field.brief_explanation', type: 'textarea', group: 'Estudio', fullWidth: true },
  { column: 'phase', labelKey: 'research.field.phase', type: 'datalist', group: 'Estudio', options: PHASES },
  { column: 'study_type', labelKey: 'research.field.study_type', type: 'select', group: 'Estudio', options: STUDY_TYPES },
  { column: 'recruitment_status', labelKey: 'research.field.recruitment_status', type: 'datalist', group: 'Estudio', options: STATUSES },
  { column: 'study_start_date', labelKey: 'research.field.study_start_date', type: 'date', group: 'Estudio' },
  { column: 'primary_completion_date', labelKey: 'research.field.primary_completion_date', type: 'date', group: 'Estudio' },
  { column: 'countries', labelKey: 'research.field.countries', type: 'text', group: 'Estudio' },
  { column: 'spain_focus', labelKey: 'research.field.spain_focus', type: 'checkbox', group: 'Estudio' },
  { column: 'record_link', labelKey: 'research.field.record_link', type: 'url', group: 'Estudio', fullWidth: true },
  { column: 'lead_sponsor', labelKey: 'research.field.lead_sponsor', type: 'text', group: 'Estudio' },
  { column: 'sponsor_type', labelKey: 'research.field.sponsor_type', type: 'text', group: 'Estudio' },
  { column: 'stage', labelKey: 'research.field.stage', type: 'select', group: 'Estudio', options: PIPELINE_COLS, required: true },
  // — Contacto —
  { column: 'contact_name', labelKey: 'research.field.contact_name', type: 'text', group: 'Contacto' },
  { column: 'contact_role', labelKey: 'research.field.contact_role', type: 'text', group: 'Contacto' },
  { column: 'contact_email', labelKey: 'research.field.contact_email', type: 'email', group: 'Contacto' },
  { column: 'contact_phone', labelKey: 'research.field.contact_phone', type: 'tel', group: 'Contacto' },
  { column: 'contact_source', labelKey: 'research.field.contact_source', type: 'text', group: 'Contacto' },
  { column: 'contact2_name', labelKey: 'research.field.contact2_name', type: 'text', group: 'Contacto' },
  { column: 'contact2_role', labelKey: 'research.field.contact2_role', type: 'text', group: 'Contacto' },
  { column: 'contact2_email', labelKey: 'research.field.contact2_email', type: 'email', group: 'Contacto' },
  { column: 'contact2_phone', labelKey: 'research.field.contact2_phone', type: 'tel', group: 'Contacto' },
  // — Seguimiento —
  { column: 'next_followup_date', labelKey: 'research.field.next_followup_date', type: 'date', group: 'Seguimiento' },
  { column: 'email_date', labelKey: 'research.field.email_date', type: 'date', group: 'Seguimiento' },
  { column: 'notes', labelKey: 'research.field.notes', type: 'textarea', group: 'Seguimiento', fullWidth: true },
  { column: 'internal_note', labelKey: 'research.field.internal_note', type: 'textarea', group: 'Seguimiento', fullWidth: true },
]

const LEAD_COLUMNS = new Set(LEAD_FIELD_DEFS.map(f => f.column))

// Aliases de headers CSV legacy (nombres amigables) -> columna real, para importar
// archivos exportados con el formato viejo. Las columnas reales se aceptan tal cual.
const CSV_ALIASES: Record<string, string> = {
  nct: 'nct_number',
  status: 'recruitment_status',
  email: 'contact_email',
  phone: 'contact_phone',
  second_contact: 'contact2_name',
  second_email: 'contact2_email',
  next_followup: 'next_followup_date',
  note: 'internal_note',
}

// Export: headers = columnas reales (round-trip directo). El orden es el de LEAD_FIELD_DEFS.
export const EXPORT_HEADERS = LEAD_FIELD_DEFS.map(f => f.column)

// Import: resuelve un header (columna real o alias legacy) a su columna; null si no mapea.
export const leadColumnFor = (header: string): string | null =>
  (LEAD_COLUMNS.has(header) ? header : null) ?? CSV_ALIASES[header] ?? null

// Normaliza un valor del form para la DB: checkbox -> boolean; '' / undefined -> null.
export function coerceLeadValue(column: string, value: any): any {
  const def = LEAD_FIELD_DEFS.find(f => f.column === column)
  if (def?.type === 'checkbox') return value === true || value === 'true'
  if (value === '' || value === undefined) return null
  return value
}

// Payload de solo columnas conocidas, listo para insert/update (no incluye id/timestamps).
export function buildLeadPayload(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const f of LEAD_FIELD_DEFS) out[f.column] = coerceLeadValue(f.column, data[f.column])
  return out
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Valida un lead antes de guardar. Devuelve la CLAVE i18n del error, o null si es válido.
export function validateLead(data: Record<string, any>): I18nKey | null {
  const val = (c: string) => (data[c] ?? '').toString().trim()
  if (!val('official_title')) return 'research.validation.title'
  if (!val('stage')) return 'research.validation.stage'
  if (!val(NCT_COLUMN) && !val('contact_name') && !val('contact_email')) return 'research.validation.nctOrContact'
  for (const c of ['contact_email', 'contact2_email']) {
    const v = val(c)
    if (v && !EMAIL_RE.test(v)) return 'research.validation.email'
  }
  const link = val('record_link')
  if (link && !/^https?:\/\//i.test(link)) return 'research.validation.url'
  return null
}

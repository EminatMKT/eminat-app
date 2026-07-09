// Fuente de verdad de los campos de un lead de Research.
//
// `column` es la columna REAL de research_leads (lo que se guarda/lee). De acá derivan
// el form (input por tipo + validación), saveLead, y export/import. Reemplaza los
// LEAD_FIELDS / FIELD_LABELS / CSV_COLUMN_MAP sueltos, que usaban nombres amigables
// distintos de las columnas y rompían el guardado, la edición, el detalle y el import.
import { PIPELINE_COLS } from './constants'

export type LeadFieldType = 'text' | 'email' | 'tel' | 'url' | 'date' | 'textarea' | 'select' | 'datalist' | 'checkbox'
export type LeadFieldGroup = 'Estudio' | 'Contacto' | 'Seguimiento'

export interface LeadFieldDef {
  column: string
  label: string
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

export const LEAD_FIELD_DEFS: LeadFieldDef[] = [
  // — Estudio —
  { column: 'date_added', label: 'Date Added', type: 'date', group: 'Estudio' },
  { column: 'nct_number', label: 'NCT#', type: 'text', group: 'Estudio' },
  { column: 'official_title', label: 'Official Title', type: 'text', group: 'Estudio', fullWidth: true, required: true },
  { column: 'conditions', label: 'Conditions', type: 'text', group: 'Estudio' },
  { column: 'brief_explanation', label: 'Brief Explanation', type: 'textarea', group: 'Estudio', fullWidth: true },
  { column: 'phase', label: 'Phase', type: 'datalist', group: 'Estudio', options: PHASES },
  { column: 'study_type', label: 'Study Type', type: 'select', group: 'Estudio', options: STUDY_TYPES },
  { column: 'recruitment_status', label: 'Status', type: 'datalist', group: 'Estudio', options: STATUSES },
  { column: 'study_start_date', label: 'Study Start', type: 'date', group: 'Estudio' },
  { column: 'primary_completion_date', label: 'Primary Completion', type: 'date', group: 'Estudio' },
  { column: 'countries', label: 'Countries', type: 'text', group: 'Estudio' },
  { column: 'spain_focus', label: 'Spain Focus', type: 'checkbox', group: 'Estudio' },
  { column: 'record_link', label: 'Record Link', type: 'url', group: 'Estudio', fullWidth: true },
  { column: 'lead_sponsor', label: 'Lead Sponsor', type: 'text', group: 'Estudio' },
  { column: 'sponsor_type', label: 'Sponsor Type', type: 'text', group: 'Estudio' },
  { column: 'stage', label: 'Stage', type: 'select', group: 'Estudio', options: PIPELINE_COLS, required: true },
  // — Contacto —
  { column: 'contact_name', label: 'Contact Name', type: 'text', group: 'Contacto' },
  { column: 'contact_role', label: 'Contact Role', type: 'text', group: 'Contacto' },
  { column: 'contact_email', label: 'Contact Email', type: 'email', group: 'Contacto' },
  { column: 'contact_phone', label: 'Contact Phone', type: 'tel', group: 'Contacto' },
  { column: 'contact_source', label: 'Contact Source', type: 'text', group: 'Contacto' },
  { column: 'contact2_name', label: '2nd Contact', type: 'text', group: 'Contacto' },
  { column: 'contact2_role', label: '2nd Role', type: 'text', group: 'Contacto' },
  { column: 'contact2_email', label: '2nd Email', type: 'email', group: 'Contacto' },
  { column: 'contact2_phone', label: '2nd Phone', type: 'tel', group: 'Contacto' },
  // — Seguimiento —
  { column: 'next_followup_date', label: 'Next Follow-up', type: 'date', group: 'Seguimiento' },
  { column: 'email_date', label: 'Email Date', type: 'date', group: 'Seguimiento' },
  { column: 'notes', label: 'Notes', type: 'textarea', group: 'Seguimiento', fullWidth: true },
  { column: 'internal_note', label: 'Internal Note', type: 'textarea', group: 'Seguimiento', fullWidth: true },
]

export const DEF_BY_COLUMN: Record<string, LeadFieldDef> = Object.fromEntries(LEAD_FIELD_DEFS.map(f => [f.column, f]))
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
  if (DEF_BY_COLUMN[column]?.type === 'checkbox') return value === true || value === 'true'
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

// Valida un lead antes de guardar. Devuelve el mensaje de error, o null si es válido.
export function validateLead(data: Record<string, any>): string | null {
  const val = (c: string) => (data[c] ?? '').toString().trim()
  if (!val('official_title')) return 'Official Title es obligatorio.'
  if (!val('stage')) return 'Stage es obligatorio.'
  if (!val('nct_number') && !val('contact_name') && !val('contact_email'))
    return 'Indicá al menos NCT# o un contacto (nombre o email).'
  for (const c of ['contact_email', 'contact2_email']) {
    const v = val(c)
    if (v && !EMAIL_RE.test(v)) return `${DEF_BY_COLUMN[c].label}: email inválido.`
  }
  const link = val('record_link')
  if (link && !/^https?:\/\//i.test(link)) return 'Record Link debe empezar con http:// o https://'
  return null
}

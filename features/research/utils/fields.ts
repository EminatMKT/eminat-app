// Fuente de verdad de los campos de un lead de Research.
//
// `column` es la columna REAL de research_leads (lo que se guarda/lee). De acá derivan
// el form (input por tipo + validación), saveLead, y export/import. Reemplaza los
// LEAD_FIELDS / FIELD_LABELS / CSV_COLUMN_MAP sueltos, que usaban nombres amigables
// distintos de las columnas y rompían el guardado, la edición, el detalle y el import.
// Las etiquetas y mensajes son claves i18n (ver shared/i18n) — nada de texto hardcodeado.
import { PIPELINE_COLS, NCT_COLUMN, STAGE_LABEL_KEY } from '../constants'
import { resolveToCanonical } from '@/shared/utils/canonical'
import { SPECIALTIES, SPECIALTY_LABEL_KEY, canonicalSpecialty } from './specialty'
import type { I18nKey } from '@/shared/i18n'

export type LeadFieldType = 'text' | 'email' | 'tel' | 'url' | 'date' | 'textarea' | 'select' | 'datalist' | 'checkbox' | 'number'
export type LeadFieldGroup = 'Estudio' | 'Contacto' | 'Seguimiento'

export interface LeadFieldDef {
  column: string
  labelKey: I18nKey
  type: LeadFieldType
  group: LeadFieldGroup
  fullWidth?: boolean
  required?: boolean
  // Se muestra en el form pero no se edita ahí. Su escritura manual tiene una vía dedicada
  // (ej. el pop-up del contador), y `buildLeadPayload` lo excluye para que guardar el form
  // no lo pise con lo que tenga el estado del modal.
  readOnly?: boolean
  options?: string[] // select / datalist
  // Traduce el texto visible de cada opción (value se mantiene canónico). Solo display.
  optionLabelKey?: Record<string, I18nKey>
  // Deriva un valor entrante no-exacto al dominio (import). null = no reconocido.
  normalize?: (raw: string) => string | null
}

// Sugerencias (datalist) — admiten valor libre para no romper data existente (ej. phase="2").
const PHASES = ['Early Phase 1', 'Phase 1', 'Phase 1/Phase 2', 'Phase 2', 'Phase 2/Phase 3', 'Phase 3', 'Phase 4', 'N/A']
const STATUSES = ['Recruiting', 'Not yet recruiting', 'Enrolling by invitation', 'Active, not recruiting', 'Completed', 'Suspended', 'Terminated', 'Withdrawn', 'Unknown status']
const STUDY_TYPES = ['Interventional', 'Observational'] // dominio cerrado -> select estricto

// Los CSV suelen traer la fase como número o multivalor ("2", "1 & 2") en vez del label del
// dominio. Deriva el canónico desde los dígitos; null si el combo no existe en PHASES.
function canonicalPhase(raw: string): string | null {
  const s = raw.toLowerCase()
  if (/n\.?\s*\/?\s*a/.test(s)) return 'N/A'
  const nums = (s.match(/\d/g) || []).filter((v, i, a) => a.indexOf(v) === i)
  if (s.includes('early') && nums.join() === '1') return 'Early Phase 1'
  if (!nums.length) return null
  const label = nums.map(n => `Phase ${n}`).join('/')
  return PHASES.includes(label) ? label : null
}

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
  { column: 'especialidad', labelKey: 'research.field.especialidad', type: 'select', group: 'Estudio', options: SPECIALTIES, optionLabelKey: SPECIALTY_LABEL_KEY, normalize: canonicalSpecialty },
  { column: 'brief_explanation', labelKey: 'research.field.brief_explanation', type: 'textarea', group: 'Estudio', fullWidth: true },
  { column: 'phase', labelKey: 'research.field.phase', type: 'datalist', group: 'Estudio', options: PHASES, normalize: canonicalPhase },
  { column: 'study_type', labelKey: 'research.field.study_type', type: 'select', group: 'Estudio', options: STUDY_TYPES },
  { column: 'recruitment_status', labelKey: 'research.field.recruitment_status', type: 'datalist', group: 'Estudio', options: STATUSES },
  { column: 'study_start_date', labelKey: 'research.field.study_start_date', type: 'date', group: 'Estudio' },
  { column: 'primary_completion_date', labelKey: 'research.field.primary_completion_date', type: 'date', group: 'Estudio' },
  { column: 'countries', labelKey: 'research.field.countries', type: 'text', group: 'Estudio' },
  { column: 'spain_focus', labelKey: 'research.field.spain_focus', type: 'checkbox', group: 'Estudio' },
  { column: 'record_link', labelKey: 'research.field.record_link', type: 'url', group: 'Estudio', fullWidth: true },
  { column: 'lead_sponsor', labelKey: 'research.field.lead_sponsor', type: 'text', group: 'Estudio' },
  { column: 'sponsor_type', labelKey: 'research.field.sponsor_type', type: 'text', group: 'Estudio' },
  { column: 'stage', labelKey: 'research.field.stage', type: 'select', group: 'Estudio', options: PIPELINE_COLS, optionLabelKey: STAGE_LABEL_KEY, required: true },
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
  // Contador de intentos de contacto (correos enviados a ese estudio). Lo escribe el pop-up con
  // confirmación o el import; en el form va READ-ONLY a propósito — ver `readOnly` abajo.
  { column: 'email_count', labelKey: 'research.field.email_count', type: 'number', group: 'Seguimiento', readOnly: true },
  { column: 'next_followup_date', labelKey: 'research.field.next_followup_date', type: 'date', group: 'Seguimiento' },
  { column: 'email_date', labelKey: 'research.field.email_date', type: 'date', group: 'Seguimiento' },
  { column: 'notes', labelKey: 'research.field.notes', type: 'textarea', group: 'Seguimiento', fullWidth: true },
  { column: 'internal_note', labelKey: 'research.field.internal_note', type: 'textarea', group: 'Seguimiento', fullWidth: true },
]

const LEAD_COLUMNS = LEAD_FIELD_DEFS.map(f => f.column)

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
  // El correo de Federico (12/08/2026) titula la columna "Email Count (Royner)". normHeader la
  // deja en 'email_count_(royner)': sin este alias el import la ignora en silencio.
  'email_count_(royner)': 'email_count',
  email_count_royner: 'email_count',
  intentos: 'email_count',
  // La misma tabla trae la etapa bajo el header en español.
  etapa: 'stage',
}

// Export: headers = columnas reales (round-trip directo). El orden es el de LEAD_FIELD_DEFS.
export const EXPORT_HEADERS = LEAD_FIELD_DEFS.map(f => f.column)

// Import: resuelve un header (columna real o alias legacy) a su columna; null si no mapea.
export const leadColumnFor = (header: string): string | null =>
  resolveToCanonical(header, LEAD_COLUMNS, { aliases: CSV_ALIASES })

// Campos con dominio fijo (los que tienen options): el import normaliza el valor entrante
// al valor canónico del dominio en vez de solo mapear la columna.
export const DOMAIN_FIELDS = LEAD_FIELD_DEFS.filter(f => f.options)
export const domainOptions = (column: string): string[] | undefined =>
  LEAD_FIELD_DEFS.find(f => f.column === column)?.options

// Resuelve un valor entrante al dominio de la columna, reusando resolveToCanonical.
// '' => '' (vacío, ok). Un string => valor canónico del dominio. null => no reconocido
// (el usuario debe mapearlo en el import). El derivador sale del propio def (ej. phase).
export function normalizeDomainValue(column: string, raw: unknown): string | null {
  const def = LEAD_FIELD_DEFS.find(f => f.column === column)
  const v = String(raw ?? '').trim()
  if (!v || !def?.options) return v // vacío, o campo sin dominio: tal cual
  return resolveToCanonical(v, def.options, { derive: def.normalize })
}

// Normaliza un valor del form para la DB: checkbox -> boolean; '' / undefined -> null.
export function coerceLeadValue(column: string, value: unknown): unknown {
  const def = LEAD_FIELD_DEFS.find(f => f.column === column)
  if (def?.type === 'checkbox') return value === true || value === 'true'
  if (def?.type === 'number') return coerceCount(value)
  if (value === '' || value === undefined) return null
  return value
}

// Entero >= 0 o null. El dato viene del Excel de Royner, así que tolera la coma decimal del
// locale es ("3,0") y devuelve null —no NaN— ante basura o negativos: un NaN llegaría al
// insert y lo reventaría en runtime, y "no sé cuántos" no es lo mismo que "cero correos".
function coerceCount(value: any): number | null {
  const raw = (value ?? '').toString().trim().replace(',', '.')
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null
}

// Payload de solo columnas conocidas, listo para insert/update (no incluye id/timestamps).
// Los campos `readOnly` quedan FUERA: se escriben por su vía dedicada (el pop-up del contador),
// y si viajaran acá, guardar el form los pisaría con lo que tenga el estado del modal —
// editar un teléfono podría borrar el contador.
export function buildLeadPayload(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of LEAD_FIELD_DEFS) {
    if (f.readOnly) continue
    out[f.column] = coerceLeadValue(f.column, data[f.column])
  }
  return out
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Valida un lead. Devuelve un mapa columna → CLAVE i18n del error (vacío = válido).
// La regla nct-o-contacto se ancla en nct_number (primer campo del grupo obligatorio).
export function validateLeadFields(data: Record<string, unknown>): Record<string, I18nKey> {
  const val = (c: string) => String(data[c] ?? '').trim()
  const errors: Record<string, I18nKey> = {}
  if (!val('official_title')) errors.official_title = 'research.validation.title'
  if (!val('stage')) errors.stage = 'research.validation.stage'
  if (!val(NCT_COLUMN) && !val('contact_name') && !val('contact_email')) errors[NCT_COLUMN] = 'research.validation.nctOrContact'
  for (const c of ['contact_email', 'contact2_email']) {
    const v = val(c)
    if (v && !EMAIL_RE.test(v)) errors[c] = 'research.validation.email'
  }
  const link = val('record_link')
  if (link && !/^https?:\/\//i.test(link)) errors.record_link = 'research.validation.url'
  return errors
}

// Primer error como clave i18n, o null. Red de seguridad para saveLead (la UI valida por campo).
export function validateLead(data: Record<string, unknown>): I18nKey | null {
  return Object.values(validateLeadFields(data))[0] ?? null
}

// ponytail: COUNTRY_FLAGS (Leads-by-Country) was commented out 2026-07-20; find it in git
// history (`stages.ts` before the 2026-10-06 split) if ever restoring that feature.

const NCT_TITLE_COLUMN_WIDTH = 118
const STUDY_TITLE_COLUMN_WIDTH = 240

/** Frozen leads-table columns (NCT# and title): the second column's `left` must equal the first column's `width`, or the sticky columns overlap. */
export const FROZEN_COLS = [
  { width: NCT_TITLE_COLUMN_WIDTH, left: 0 },
  { width: STUDY_TITLE_COLUMN_WIDTH, left: NCT_TITLE_COLUMN_WIDTH },
] as const

// A lead's fields (form/export/import/validation) live in ../utils/fields.ts.

/** The study's identifier on ClinicalTrials.gov — single source, don't repeat the literal. */
export const NCT_COLUMN = 'nct_number'
/** Contact-attempt counter (emails sent for that study) — single source. */
export const COUNT_COLUMN = 'email_count'
/** Used to look up the study by title on ClinicalTrials.gov. */
export const TITLE_COLUMN = 'official_title'
export const NCT_RE = /^NCT\d{8}$/i
export const CLINICAL_TRIALS_BASE = 'https://clinicaltrials.gov'

export const MAIL_ESTADO_COLOR: Record<string, string> = {
  Borrador: '#9CA3AF',
  Programado: '#60A5FA',
  Enviado: '#34D399',
  Cancelado: '#F87171',
}

// Small, unrelated constants (table layout, DB columns, mail-estado palette) kept out of stages.ts.

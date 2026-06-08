// Single source of truth for the Company picker in admin user-management
// (and anywhere else a company chip is rendered). Add / remove / reorder
// entries here and the UI picks it up.
//
// `name` is what gets stored in usuarios.empresa, so changes to it would
// orphan existing rows. Add a legacy alias to LEGACY_COMPANY_ALIASES below
// if you ever rename one.

export type Company = {
  /** Stored verbatim in usuarios.empresa. */
  name: string
  /** Short label rendered in the admin table chips and other tight UIs. */
  short: string
  color: string
}

export const COMPANIES: Company[] = [
  { name: 'Eminat Group',                    short: 'Eminat',    color: '#7C6FF7' },
  { name: 'Stratix Communications',          short: 'Stratix',   color: '#4F46E5' },
  { name: 'EMC (Eminat Medical Center)',     short: 'EMC',       color: '#34D399' },
  { name: 'Eminat Research Group (ERG)',     short: 'ERG',       color: '#60A5FA' },
  { name: 'Soy Vivi Negrete (SVN)',          short: 'SVN',       color: '#FB7185' },
  { name: 'Vivi Negrete Foundation (VNF)',   short: 'VNF',       color: '#F472B6' },
  { name: 'Premier by Eminat',               short: 'Premier',   color: '#FB923C' },
  { name: 'Eminat Mentor',                   short: 'Mentor',    color: '#FBB040' },
  { name: 'Ondara Media',                    short: 'Ondara',    color: '#06B6D4' },
  { name: 'DaCoach IS',                      short: 'DaCoach',   color: '#A78BFA' },
]

export const DEFAULT_COMPANY = 'Eminat Group'

/** Order-preserved list for <select> dropdowns. */
export const COMPANY_NAMES: string[] = COMPANIES.map((c) => c.name)

// ── Legacy aliases ─────────────────────────────────────────────────────
// Existing usuarios rows from before the rename store the old names.
// Resolve them to the same color so chips stay coherent until those
// rows are edited and re-saved with one of the new canonical names.
const LEGACY_COMPANY_ALIASES: Record<string, string> = {
  'Eminat Holding':            '#7C6FF7', // → Eminat Group
  'Eminat Medical Center':     '#34D399', // → EMC (Eminat Medical Center)
  'Eminat Research Group':     '#60A5FA', // → Eminat Research Group (ERG)
  'Vivi Negrete Foundation':   '#F472B6', // → Vivi Negrete Foundation (VNF)
  'Soy Vivi Negrete':          '#FB7185', // → Soy Vivi Negrete (SVN)
}

export const COMPANY_COLORS: Record<string, string> = {
  ...Object.fromEntries(COMPANIES.map((c) => [c.name, c.color])),
  ...LEGACY_COMPANY_ALIASES,
}

/** Compact label for chips. Falls back to a heuristic strip for unknown
 *  values so legacy rows still get a sensible label. */
export function companyShort(name: string): string {
  if (!name) return ''
  const known = COMPANIES.find((c) => c.name === name)
  if (known) return known.short
  return name.replace('Eminat ', '').replace(' by Eminat', '').trim()
}

/** When an existing row carries a legacy empresa value that's not in the
 *  dropdown, prepend it as a one-off option so the <select> shows the
 *  current value selected. The admin can then change it to a canonical
 *  entry on the next save. */
export function companyOptions(currentValue?: string | null): string[] {
  if (!currentValue || COMPANY_NAMES.includes(currentValue)) return COMPANY_NAMES
  return [currentValue, ...COMPANY_NAMES]
}

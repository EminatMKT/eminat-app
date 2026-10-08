/** Count-only columns and literal filter values for the patient-registry dashboard counts. Kept
 *  local here instead of the shared `TABLE_COLUMNS` catalog since none of these columns are
 *  reused across tables. */
export const ID_COLUMN = 'id'
export const EMAIL_COLUMN = 'email'
export const GENERO_COLUMN = 'genero'
export const TELEFONO_COLUMN = 'telefono'
export const FECHA_NACIMIENTO_COLUMN = 'fecha_nacimiento'
export const IS_OPERATOR = 'is'
export const GENERO_FEMALE = 'F'
export const GENERO_MALE = 'M'

/** `head: true` means PostgREST never returns row data, only the match count. */
export const COUNT_ONLY = { count: 'exact', head: true } as const

/** Known Florida area codes the registry concentrates in, grouped by county. `telefono` is
 *  stored pre-formatted as `(XXX) XXX-XXXX`, so the match pattern built from these codes
 *  targets that shape — a bare-digit prefix would silently match zero rows. */
const AREA_CODE_786 = '786'
const AREA_CODE_305 = '305'
const AREA_CODE_954 = '954'
const AREA_CODE_754 = '754'
const AREA_CODE_561 = '561'
export const AREA_CODE_OTHER = 'other'
const LABEL_MIAMI_DADE = 'Miami-Dade'
const LABEL_BROWARD = 'Broward'
const LABEL_PALM_BEACH = 'Palm Beach'
export const LABEL_OTHER = 'Other'

export const KNOWN_AREA_CODES: { code: string; label: string }[] = [
  { code: AREA_CODE_786, label: LABEL_MIAMI_DADE },
  { code: AREA_CODE_305, label: LABEL_MIAMI_DADE },
  { code: AREA_CODE_954, label: LABEL_BROWARD },
  { code: AREA_CODE_754, label: LABEL_BROWARD },
  { code: AREA_CODE_561, label: LABEL_PALM_BEACH },
]

/** Cutoff ages for the five age buckets, youngest to oldest. Exported so the test can build
 *  the same cutoff dates independently of the `cutoffIso` helper in `derive.ts`. */
export const CHILD_CUTOFF_YEARS = 18
export const YOUNG_ADULT_CUTOFF_YEARS = 35
export const ADULT_CUTOFF_YEARS = 50
export const OLDER_ADULT_CUTOFF_YEARS = 65

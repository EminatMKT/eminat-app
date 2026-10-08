import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/shared/db'
import { TABLES } from '@/shared/data/tables'
import type { AreaCodeCount, PatientDashboardCounts } from './types'

// Count-only columns. These stay local to this module instead of the shared `TABLE_COLUMNS`
// catalog: that catalog only names columns reused across tables, and none of these are.
const ID_COLUMN = 'id'
const EMAIL_COLUMN = 'email'
const GENERO_COLUMN = 'genero'
const TELEFONO_COLUMN = 'telefono'
const FECHA_NACIMIENTO_COLUMN = 'fecha_nacimiento'
const IS_OPERATOR = 'is'
const GENERO_FEMALE = 'F'
const GENERO_MALE = 'M'

const COUNT_ONLY = { count: 'exact', head: true } as const

// Known Florida area codes the registry concentrates in, grouped by county. `telefono` is
// stored pre-formatted as `(XXX) XXX-XXXX` (see `formatearTelefono`), so the match pattern is
// built against that shape — a bare-digit prefix would silently match zero rows.
const AREA_CODE_786 = '786'
const AREA_CODE_305 = '305'
const AREA_CODE_954 = '954'
const AREA_CODE_754 = '754'
const AREA_CODE_561 = '561'
const AREA_CODE_OTHER = 'other'
const LABEL_MIAMI_DADE = 'Miami-Dade'
const LABEL_BROWARD = 'Broward'
const LABEL_PALM_BEACH = 'Palm Beach'
const LABEL_OTHER = 'Other'

const KNOWN_AREA_CODES: { code: string; label: string }[] = [
  { code: AREA_CODE_786, label: LABEL_MIAMI_DADE },
  { code: AREA_CODE_305, label: LABEL_MIAMI_DADE },
  { code: AREA_CODE_954, label: LABEL_BROWARD },
  { code: AREA_CODE_754, label: LABEL_BROWARD },
  { code: AREA_CODE_561, label: LABEL_PALM_BEACH },
]

// Cutoff ages for the five buckets, youngest to oldest.
const CHILD_CUTOFF_YEARS = 18
const YOUNG_ADULT_CUTOFF_YEARS = 35
const ADULT_CUTOFF_YEARS = 50
const OLDER_ADULT_CUTOFF_YEARS = 65

type CountResult = { count: number | null; error: PostgrestError | null }

function pacientesTable() {
  return supabase.from(TABLES.pacientes)
}

function readCount(result: CountResult): number {
  if (result.error) throw result.error
  return result.count ?? 0
}

// Every count query selects `ID_COLUMN` regardless of which column it filters on: with
// `head: true` PostgREST never returns the selected column's data, only the match count, so
// the column list is just a placeholder — and keeping it uniform is what makes "never select
// a full row" mechanically checkable in the tests.
function countQuery() {
  return pacientesTable().select(ID_COLUMN, COUNT_ONLY)
}

async function countTotalPatients(): Promise<number> {
  const result = await countQuery()
  return readCount(result)
}

async function countWithEmail(): Promise<number> {
  const result = await countQuery().not(EMAIL_COLUMN, IS_OPERATOR, null)
  return readCount(result)
}

async function countByGenero(value: string): Promise<number> {
  const result = await countQuery().eq(GENERO_COLUMN, value)
  return readCount(result)
}

// Born strictly after `cutoffIso` (younger than the cutoff age).
async function countBornAfter(cutoffIso: string): Promise<number> {
  const result = await countQuery().gt(FECHA_NACIMIENTO_COLUMN, cutoffIso)
  return readCount(result)
}

// Born on or before `untilIso` and strictly after `sinceIso` — the (older, younger] band between
// two cutoff ages.
async function countBornBetween(sinceIso: string, untilIso: string): Promise<number> {
  const result = await countQuery().lte(FECHA_NACIMIENTO_COLUMN, untilIso).gt(FECHA_NACIMIENTO_COLUMN, sinceIso)
  return readCount(result)
}

// Born on or before `cutoffIso` (older than, or exactly, the cutoff age).
async function countBornOnOrBefore(cutoffIso: string): Promise<number> {
  const result = await countQuery().lte(FECHA_NACIMIENTO_COLUMN, cutoffIso)
  return readCount(result)
}

async function countByAreaCode(code: string): Promise<number> {
  const pattern = `(${code})%`
  const result = await countQuery().like(TELEFONO_COLUMN, pattern)
  return readCount(result)
}

// ISO (YYYY-MM-DD) date `yearsAgo` years before `today` — a birth-date cutoff for an age bucket.
function cutoffIso(yearsAgo: number, today: Date): string {
  const cutoff = new Date(today.getFullYear() - yearsAgo, today.getMonth(), today.getDate())
  return cutoff.toISOString().slice(0, 10)
}

// Known-prefix counts plus one trailing `other` bucket, so the areas always sum to the total
// without a query for every unlisted prefix.
async function computeAreaCodes(totalPatients: number): Promise<AreaCodeCount[]> {
  const entries: AreaCodeCount[] = []
  let knownTotal = 0
  for (const known of KNOWN_AREA_CODES) {
    const count = await countByAreaCode(known.code)
    entries.push({ code: known.code, label: known.label, count })
    knownTotal += count
  }
  entries.push({ code: AREA_CODE_OTHER, label: LABEL_OTHER, count: totalPatients - knownTotal })
  return entries
}

// Dashboard-ready counts for the patient registry, read only through Supabase COUNT queries
// (`select(ID_COLUMN, COUNT_ONLY)`, never `select('*')`), so opening the Dashboard tab never
// loads the full `pacientes` table. Birthday fields stay `null`: `fecha_nacimiento` is a plain
// `date` column with no month extraction available without a database aggregate, which this
// bite does not add. Median/min/max age and the duplicate/typo data-quality counts stay `null`
// for the same reason — they need a full row load or a database aggregate this bite forbids.
export default async function patientDashboardCounts(): Promise<PatientDashboardCounts> {
  const today = new Date()
  const childCutoff = cutoffIso(CHILD_CUTOFF_YEARS, today)
  const youngAdultCutoff = cutoffIso(YOUNG_ADULT_CUTOFF_YEARS, today)
  const adultCutoff = cutoffIso(ADULT_CUTOFF_YEARS, today)
  const olderAdultCutoff = cutoffIso(OLDER_ADULT_CUTOFF_YEARS, today)

  const totalPatients = await countTotalPatients()
  const withEmail = await countWithEmail()
  const female = await countByGenero(GENERO_FEMALE)
  const male = await countByGenero(GENERO_MALE)
  const child = await countBornAfter(childCutoff)
  const youngAdult = await countBornBetween(youngAdultCutoff, childCutoff)
  const adult = await countBornBetween(adultCutoff, youngAdultCutoff)
  const olderAdult = await countBornBetween(olderAdultCutoff, adultCutoff)
  const senior = await countBornOnOrBefore(olderAdultCutoff)
  const areaCodes = await computeAreaCodes(totalPatients)

  const withoutEmail = totalPatients - withEmail
  const genderUnknown = totalPatients - female - male
  const ageBucketsUnknown = totalPatients - (child + youngAdult + adult + olderAdult + senior)

  const gender = { female, male, unknown: genderUnknown }
  const ageBuckets = { child, youngAdult, adult, olderAdult, senior, unknown: ageBucketsUnknown }
  const dataQuality = {
    missingEmail: withoutEmail,
    sharedPhone: null,
    sharedEmail: null,
    repeatedName: null,
    typoEmailDomain: null,
  }

  const counts: PatientDashboardCounts = {
    totalPatients,
    withEmail,
    withoutEmail,
    medianAge: null,
    minAge: null,
    maxAge: null,
    birthdaysThisMonth: null,
    birthdaysByMonth: null,
    gender,
    ageBuckets,
    areaCodes,
    dataQuality,
  }

  return counts
}

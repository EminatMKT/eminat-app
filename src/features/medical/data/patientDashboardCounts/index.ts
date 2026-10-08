import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/shared/db'
import { TABLES } from '@/shared/data/tables'
import type { AreaCodeCount, PatientDashboardCounts } from './types'

// Count-only columns. These stay local to this module instead of the shared `TABLE_COLUMNS`
// catalog: that catalog only names columns reused across tables, and none of these are.
// Exported (as constants, not functions — plain constants don't count against the one-exported
// -function-per-file rule) so the test suite asserts filter arguments against the same names
// the implementation uses, instead of duplicating them as its own string literals.
export const ID_COLUMN = 'id'
export const EMAIL_COLUMN = 'email'
export const GENERO_COLUMN = 'genero'
export const TELEFONO_COLUMN = 'telefono'
export const FECHA_NACIMIENTO_COLUMN = 'fecha_nacimiento'
export const IS_OPERATOR = 'is'
export const GENERO_FEMALE = 'F'
export const GENERO_MALE = 'M'

const COUNT_ONLY = { count: 'exact', head: true } as const

// Known Florida area codes the registry concentrates in, grouped by county. `telefono` is
// stored pre-formatted as `(XXX) XXX-XXXX` (see `formatearTelefono`), so the match pattern is
// built against that shape — a bare-digit prefix would silently match zero rows.
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

// Cutoff ages for the five buckets, youngest to oldest. Exported so the test can build the same
// cutoff dates independently, without importing the (unexported, to stay the file's one function
// export) `cutoffIso` helper itself.
export const CHILD_CUTOFF_YEARS = 18
export const YOUNG_ADULT_CUTOFF_YEARS = 35
export const ADULT_CUTOFF_YEARS = 50
export const OLDER_ADULT_CUTOFF_YEARS = 65

const DATE_PART_LENGTH = 2
const ZERO_PAD = '0'

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

// Born strictly after `cutoffIsoValue` (younger than the cutoff age).
async function countBornAfter(cutoffIsoValue: string): Promise<number> {
  const result = await countQuery().gt(FECHA_NACIMIENTO_COLUMN, cutoffIsoValue)
  return readCount(result)
}

// Born on or before `untilIso` and strictly after `sinceIso` — the (older, younger] band between
// two cutoff ages.
async function countBornBetween(sinceIso: string, untilIso: string): Promise<number> {
  const result = await countQuery().lte(FECHA_NACIMIENTO_COLUMN, untilIso).gt(FECHA_NACIMIENTO_COLUMN, sinceIso)
  return readCount(result)
}

// Born on or before `cutoffIsoValue` (older than, or exactly, the cutoff age).
async function countBornOnOrBefore(cutoffIsoValue: string): Promise<number> {
  const result = await countQuery().lte(FECHA_NACIMIENTO_COLUMN, cutoffIsoValue)
  return readCount(result)
}

async function countByAreaCode(code: string): Promise<number> {
  const pattern = `(${code})%`
  const result = await countQuery().like(TELEFONO_COLUMN, pattern)
  return readCount(result)
}

// ISO (YYYY-MM-DD) local-calendar date `yearsAgo` years before `today` — a birth-date cutoff
// for an age bucket. Built from `today`'s own local year/month/day instead of round-tripping
// through `toISOString()` (which converts to UTC and can shift the date near midnight,
// depending on the local time zone offset).
function cutoffIso(yearsAgo: number, today: Date): string {
  const year = today.getFullYear() - yearsAgo
  const month = String(today.getMonth() + 1).padStart(DATE_PART_LENGTH, ZERO_PAD)
  const day = String(today.getDate()).padStart(DATE_PART_LENGTH, ZERO_PAD)
  return `${year}-${month}-${day}`
}

// Known-prefix counts paired with their area, plus one trailing `other` bucket so the areas
// always sum to the total without a query for every unlisted prefix.
function buildAreaCodeEntries(totalPatients: number, knownCounts: number[]): AreaCodeCount[] {
  const entries: AreaCodeCount[] = KNOWN_AREA_CODES.map((known, index) => ({
    code: known.code,
    label: known.label,
    count: knownCounts[index] ?? 0,
  }))
  const knownTotal = knownCounts.reduce((sum, count) => sum + count, 0)
  entries.push({ code: AREA_CODE_OTHER, label: LABEL_OTHER, count: totalPatients - knownTotal })
  return entries
}

// Dashboard-ready counts for the patient registry, read only through Supabase COUNT queries
// (`select(ID_COLUMN, COUNT_ONLY)`, never `select('*')`), so opening the Dashboard tab never
// loads the full `pacientes` table. Birthday fields stay `null`: `fecha_nacimiento` is a plain
// `date` column with no month extraction available without a database aggregate, which this
// bite does not add. Median/min/max age and the duplicate/typo data-quality counts stay `null`
// for the same reason — they need a full row load or a database aggregate this bite forbids.
//
// None of the 14 count queries depends on another's *construction* — only the derived
// subtractions below depend on their *values* — so every query fires concurrently through one
// `Promise.all`, instead of 14 sequential round-trips.
export default async function patientDashboardCounts(): Promise<PatientDashboardCounts> {
  const today = new Date()
  const childCutoff = cutoffIso(CHILD_CUTOFF_YEARS, today)
  const youngAdultCutoff = cutoffIso(YOUNG_ADULT_CUTOFF_YEARS, today)
  const adultCutoff = cutoffIso(ADULT_CUTOFF_YEARS, today)
  const olderAdultCutoff = cutoffIso(OLDER_ADULT_CUTOFF_YEARS, today)

  const [totalPatients, withEmail, female, male, ageCounts, knownAreaCounts] = await Promise.all([
    countTotalPatients(),
    countWithEmail(),
    countByGenero(GENERO_FEMALE),
    countByGenero(GENERO_MALE),
    Promise.all([
      countBornAfter(childCutoff),
      countBornBetween(youngAdultCutoff, childCutoff),
      countBornBetween(adultCutoff, youngAdultCutoff),
      countBornBetween(olderAdultCutoff, adultCutoff),
      countBornOnOrBefore(olderAdultCutoff),
    ]),
    Promise.all(KNOWN_AREA_CODES.map((known) => countByAreaCode(known.code))),
  ])

  const [child, youngAdult, adult, olderAdult, senior] = ageCounts
  const areaCodes = buildAreaCodeEntries(totalPatients, knownAreaCounts)

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

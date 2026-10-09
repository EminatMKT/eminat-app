import type { PatientDashboardCounts } from './types'
import { GENERO_FEMALE, GENERO_MALE, KNOWN_AREA_CODES } from './constants'
import { CHILD_CUTOFF_YEARS, YOUNG_ADULT_CUTOFF_YEARS, ADULT_CUTOFF_YEARS, OLDER_ADULT_CUTOFF_YEARS } from './constants'
import derive from './derive'
import queries from './queries'

/** Dashboard-ready counts for the patient registry, built from Supabase COUNT queries plus one
 *  aggregate RPC for birthday months — opening the Dashboard tab never loads full patient rows.
 *  The other data-quality fields stay `null` until their own aggregates exist. */
export default async function patientDashboardCounts(): Promise<PatientDashboardCounts> {
  const today = new Date()
  const childCutoff = derive.cutoffIso(CHILD_CUTOFF_YEARS, today)
  const youngAdultCutoff = derive.cutoffIso(YOUNG_ADULT_CUTOFF_YEARS, today)
  const adultCutoff = derive.cutoffIso(ADULT_CUTOFF_YEARS, today)
  const olderAdultCutoff = derive.cutoffIso(OLDER_ADULT_CUTOFF_YEARS, today)

  const areaCountTasks = KNOWN_AREA_CODES.map((known) => queries.countByAreaCode(known.code))
  const countTasks = [
    queries.countTotalPatients(),
    queries.countWithEmail(),
    queries.countByGenero(GENERO_FEMALE),
    queries.countByGenero(GENERO_MALE),
    queries.countBornAfter(childCutoff),
    queries.countBornBetween(youngAdultCutoff, childCutoff),
    queries.countBornBetween(adultCutoff, youngAdultCutoff),
    queries.countBornBetween(olderAdultCutoff, adultCutoff),
    queries.countBornOnOrBefore(olderAdultCutoff),
    ...areaCountTasks,
  ]
  const [countResults, birthdayRows] = await Promise.all([
    Promise.all(countTasks),
    queries.countBirthdaysByMonth(),
  ])
  const [totalPatients, withEmail, female, male, child, youngAdult, adult, olderAdult, senior, ...knownAreaCounts] =
    countResults
  const areaCodes = derive.buildAreaCodeEntries(totalPatients, knownAreaCounts)
  const birthdaysByMonth = derive.buildBirthdayMonths(birthdayRows)

  const withoutEmail = totalPatients - withEmail
  const genderUnknown = totalPatients - female - male
  const ageBucketsUnknown = totalPatients - (child + youngAdult + adult + olderAdult + senior)
  const birthdaysThisMonth = birthdaysByMonth[today.getMonth()].count

  const gender = { female, male, unknown: genderUnknown }
  const ageBuckets = { child, youngAdult, adult, olderAdult, senior, unknown: ageBucketsUnknown }
  const dataQuality = derive.buildDataQuality(withoutEmail)

  const counts: PatientDashboardCounts = {
    totalPatients,
    withEmail,
    withoutEmail,
    medianAge: null,
    minAge: null,
    maxAge: null,
    birthdaysThisMonth,
    birthdaysByMonth,
    gender,
    ageBuckets,
    areaCodes,
    dataQuality,
  }

  return counts
}
// This module's 14 count queries and the birthday-months RPC are independent of each other's
// construction — only the derived subtractions above depend on their values — so they run
// concurrently through nested `Promise.all` calls instead of sequential round-trips.

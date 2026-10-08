import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db', () => ({ supabase: { from: mocks.from } }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import patientDashboardCounts from '.'
import derive from './derive'
import { ID_COLUMN, EMAIL_COLUMN, GENERO_COLUMN, TELEFONO_COLUMN, FECHA_NACIMIENTO_COLUMN, IS_OPERATOR, GENERO_FEMALE, GENERO_MALE, KNOWN_AREA_CODES, AREA_CODE_OTHER, LABEL_OTHER, CHILD_CUTOFF_YEARS, YOUNG_ADULT_CUTOFF_YEARS, ADULT_CUTOFF_YEARS, OLDER_ADULT_CUTOFF_YEARS } from './constants'
const TOTAL_PATIENTS = 7101
const WITH_EMAIL = 4200
const WITHOUT_EMAIL = TOTAL_PATIENTS - WITH_EMAIL
const FEMALE = 3000
const MALE = 3500
const GENDER_UNKNOWN = TOTAL_PATIENTS - FEMALE - MALE
const CHILD = 1000
const YOUNG_ADULT = 1200
const ADULT = 1300
const OLDER_ADULT = 1400
const SENIOR = 1500
const AGE_UNKNOWN = TOTAL_PATIENTS - (CHILD + YOUNG_ADULT + ADULT + OLDER_ADULT + SENIOR)
const AREA_786 = 50
const AREA_305 = 40
const AREA_954 = 30
const AREA_754 = 20
const AREA_561 = 10
const KNOWN_AREA_COUNTS = [AREA_786, AREA_305, AREA_954, AREA_754, AREA_561]
const AREA_OTHER = TOTAL_PATIENTS - KNOWN_AREA_COUNTS.reduce((sum, count) => sum + count, 0)

// `cutoffIso` has its own black-box unit test in `derive.test.ts`; this suite trusts it here
// and only asserts the orchestrator passes the right cutoffs to the right queries.

const TODAY = new Date()
const CHILD_CUTOFF = derive.cutoffIso(CHILD_CUTOFF_YEARS, TODAY)
const YOUNG_ADULT_CUTOFF = derive.cutoffIso(YOUNG_ADULT_CUTOFF_YEARS, TODAY)
const ADULT_CUTOFF = derive.cutoffIso(ADULT_CUTOFF_YEARS, TODAY)
const OLDER_ADULT_CUTOFF = derive.cutoffIso(OLDER_ADULT_CUTOFF_YEARS, TODAY)

type Call = { method: string; args: unknown[] }

const getCall = (calls: Call[], method: string) => calls.find((call) => call.method === method)

function resolveCountFor(calls: Call[]): number {
  if (calls.length === 1) return TOTAL_PATIENTS // bare select(), no filter: the total

  const notCall = getCall(calls, 'not')
  if (notCall && notCall.args[0] === EMAIL_COLUMN && notCall.args[1] === IS_OPERATOR) return WITH_EMAIL

  const eqCall = getCall(calls, 'eq')
  if (eqCall && eqCall.args[0] === GENERO_COLUMN) {
    if (eqCall.args[1] === GENERO_FEMALE) return FEMALE
    if (eqCall.args[1] === GENERO_MALE) return MALE
  }

  const likeCall = getCall(calls, 'like')
  if (likeCall && likeCall.args[0] === TELEFONO_COLUMN) {
    const index = KNOWN_AREA_CODES.findIndex((known) => likeCall.args[1] === `(${known.code})%`)
    if (index >= 0) return KNOWN_AREA_COUNTS[index] ?? 0
  }

  const gtCall = getCall(calls, 'gt')
  const lteCall = getCall(calls, 'lte')
  if (gtCall && !lteCall) return CHILD
  if (lteCall && !gtCall) return SENIOR
  if (gtCall && lteCall) {
    if (lteCall.args[1] === CHILD_CUTOFF) return YOUNG_ADULT
    if (lteCall.args[1] === YOUNG_ADULT_CUTOFF) return ADULT
    if (lteCall.args[1] === ADULT_CUTOFF) return OLDER_ADULT
  }

  throw new Error(`unexpected query shape in test mock: ${JSON.stringify(calls)}`)
}

// One fresh chainable query per `supabase.from()` call, each with its own call log — the 14
// count queries run concurrently (Promise.all), so a single shared chain would mix unrelated
// filters together instead of keeping each logical query's recorded calls isolated.
function makeQuery() {
  const calls: Call[] = []
  const query: Record<string, unknown> = {}
  const record = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args })
    return query
  }
  query.select = vi.fn(record('select'))
  query.eq = vi.fn(record('eq'))
  query.gt = vi.fn(record('gt'))
  query.lte = vi.fn(record('lte'))
  query.not = vi.fn(record('not'))
  query.like = vi.fn(record('like'))
  query.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(resolve({ data: null, error: null, count: resolveCountFor(calls) }))
  return { query, calls }
}

describe('patientDashboardCounts', () => {
  it('returns a dashboard aggregate built only from count queries, with birthdays left null', async () => {
    const createdQueries: Call[][] = []
    mocks.from.mockImplementation(() => {
      const { query, calls } = makeQuery()
      createdQueries.push(calls)
      return query
    })

    const result = await patientDashboardCounts()

    expect(result).toEqual({
      totalPatients: TOTAL_PATIENTS,
      withEmail: WITH_EMAIL,
      withoutEmail: WITHOUT_EMAIL,
      medianAge: null,
      minAge: null,
      maxAge: null,
      birthdaysThisMonth: null,
      birthdaysByMonth: null,
      gender: { female: FEMALE, male: MALE, unknown: GENDER_UNKNOWN },
      ageBuckets: {
        child: CHILD,
        youngAdult: YOUNG_ADULT,
        adult: ADULT,
        olderAdult: OLDER_ADULT,
        senior: SENIOR,
        unknown: AGE_UNKNOWN,
      },
      areaCodes: [
        ...KNOWN_AREA_CODES.map((known, index) => ({
          code: known.code,
          label: known.label,
          count: KNOWN_AREA_COUNTS[index],
        })),
        { code: AREA_CODE_OTHER, label: LABEL_OTHER, count: AREA_OTHER },
      ],
      dataQuality: {
        missingEmail: WITHOUT_EMAIL,
        sharedPhone: null,
        sharedEmail: null,
        repeatedName: null,
        typoEmailDomain: null,
      },
    })

    // Fourteen logical count queries: total, withEmail, 2 genero, 5 age buckets, 5 area codes.
    expect(createdQueries).toHaveLength(14)

    // Every one selects only `ID_COLUMN` — never a full row (`'*'`).
    for (const calls of createdQueries) {
      expect(getCall(calls, 'select')?.args[0]).toBe(ID_COLUMN)
    }

    // Important finding 1a — area-code `.like()` calls use the `(XXX)%` pattern (matching the
    // pre-formatted `(XXX) XXX-XXXX` storage), not a bare-digit pattern, for every known prefix.
    for (const known of KNOWN_AREA_CODES) {
      const matches = createdQueries.filter((calls) => {
        const likeCall = getCall(calls, 'like')
        return likeCall?.args[0] === TELEFONO_COLUMN && likeCall.args[1] === `(${known.code})%`
      })
      expect(matches).toHaveLength(1)
    }
    const bareDigitLike = createdQueries.some((calls) => {
      const likeCall = getCall(calls, 'like')
      return typeof likeCall?.args[1] === 'string' && !(likeCall.args[1] as string).startsWith('(')
    })
    expect(bareDigitLike).toBe(false)

    // Important finding 1b — genero `.eq()` calls use the two expected values, not swapped.
    const generoEqValues = createdQueries
      .map((calls) => getCall(calls, 'eq'))
      .filter((call): call is Call => call?.args[0] === GENERO_COLUMN)
      .map((call) => call.args[1])
    expect(generoEqValues.slice().sort()).toEqual([GENERO_FEMALE, GENERO_MALE].slice().sort())

    // Important finding 1c — age-bucket `.gt`/`.lte` calls use the cutoffs in the correct
    // relative order: child only `.gt(childCutoff)`, senior only `.lte(olderAdultCutoff)`, and
    // each middle bucket's `.lte` upper bound lines up with the next younger bucket's cutoff
    // (this fails if `.gte` is substituted for `.gt`, or a cutoff is swapped/misordered).
    const ageQueries = createdQueries.filter((calls) => getCall(calls, 'gt') || getCall(calls, 'lte'))
    expect(ageQueries).toHaveLength(5)

    const childQuery = ageQueries.find((calls) => !getCall(calls, 'lte'))
    expect(getCall(childQuery ?? [], 'gt')?.args).toEqual([FECHA_NACIMIENTO_COLUMN, CHILD_CUTOFF])

    const seniorQuery = ageQueries.find((calls) => !getCall(calls, 'gt'))
    expect(getCall(seniorQuery ?? [], 'lte')?.args).toEqual([FECHA_NACIMIENTO_COLUMN, OLDER_ADULT_CUTOFF])

    const middleByUpperBound = (upperBound: string) =>
      ageQueries.find((calls) => getCall(calls, 'lte')?.args[1] === upperBound)

    const youngAdultQuery = middleByUpperBound(CHILD_CUTOFF)
    expect(getCall(youngAdultQuery ?? [], 'gt')?.args).toEqual([FECHA_NACIMIENTO_COLUMN, YOUNG_ADULT_CUTOFF])

    const adultQuery = middleByUpperBound(YOUNG_ADULT_CUTOFF)
    expect(getCall(adultQuery ?? [], 'gt')?.args).toEqual([FECHA_NACIMIENTO_COLUMN, ADULT_CUTOFF])

    const olderAdultQuery = middleByUpperBound(ADULT_CUTOFF)
    expect(getCall(olderAdultQuery ?? [], 'gt')?.args).toEqual([FECHA_NACIMIENTO_COLUMN, OLDER_ADULT_CUTOFF])
  })
})

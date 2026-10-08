import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db', () => ({ supabase: { from: mocks.from } }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import patientDashboardCounts from '.'

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
const AREA_OTHER = TOTAL_PATIENTS - (AREA_786 + AREA_305 + AREA_954 + AREA_754 + AREA_561)

// One queue entry per `await` the implementation issues, in the order it issues them: total,
// withEmail, genero F, genero M, child, youngAdult, adult, olderAdult, senior, then the five
// known area-code prefixes.
const COUNT_QUEUE = [
  TOTAL_PATIENTS,
  WITH_EMAIL,
  FEMALE,
  MALE,
  CHILD,
  YOUNG_ADULT,
  ADULT,
  OLDER_ADULT,
  SENIOR,
  AREA_786,
  AREA_305,
  AREA_954,
  AREA_754,
  AREA_561,
]

function buildChainableQuery(queue: number[]) {
  const selectCalls: unknown[][] = []
  const query: Record<string, unknown> = {}
  query.select = vi.fn((...args: unknown[]) => {
    selectCalls.push(args)
    return query
  })
  query.eq = vi.fn(() => query)
  query.gt = vi.fn(() => query)
  query.lte = vi.fn(() => query)
  query.not = vi.fn(() => query)
  query.like = vi.fn(() => query)
  query.then = (resolve: (value: unknown) => unknown) => {
    const count = queue.shift() ?? 0
    return Promise.resolve(resolve({ data: null, error: null, count }))
  }
  return { query, selectCalls }
}

describe('patientDashboardCounts', () => {
  it('returns a dashboard aggregate built only from count queries, with birthdays left null', async () => {
    const queue = [...COUNT_QUEUE]
    const { query, selectCalls } = buildChainableQuery(queue)
    mocks.from.mockReturnValue(query)

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
        { code: '786', label: 'Miami-Dade', count: AREA_786 },
        { code: '305', label: 'Miami-Dade', count: AREA_305 },
        { code: '954', label: 'Broward', count: AREA_954 },
        { code: '754', label: 'Broward', count: AREA_754 },
        { code: '561', label: 'Palm Beach', count: AREA_561 },
        { code: 'other', label: 'Other', count: AREA_OTHER },
      ],
      dataQuality: {
        missingEmail: WITHOUT_EMAIL,
        sharedPhone: null,
        sharedEmail: null,
        repeatedName: null,
        typoEmailDomain: null,
      },
    })

    expect(selectCalls.length).toBeGreaterThan(0)
    for (const call of selectCalls) {
      expect(call[0]).toBe('id')
    }
  })
})

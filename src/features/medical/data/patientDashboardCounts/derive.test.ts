import { expect, it } from 'vitest'
import derive from './derive'
import { KNOWN_AREA_CODES } from './constants'

it('builds a local-calendar ISO date N years before the given date', () => {
  const today = new Date(2026, 5, 15) // June 15, local time — month is zero-based
  expect(derive.cutoffIso(18, today)).toBe('2008-06-15')
})

it('pads single-digit month and day with a leading zero', () => {
  const today = new Date(2026, 0, 5) // January 5
  expect(derive.cutoffIso(1, today)).toBe('2025-01-05')
})

it('pairs each known area code with its count, plus a trailing other bucket', () => {
  const knownCounts = KNOWN_AREA_CODES.map(() => 10)
  const entries = derive.buildAreaCodeEntries(100, knownCounts)

  expect(entries).toHaveLength(KNOWN_AREA_CODES.length + 1)
  expect(entries[0]).toEqual({ code: KNOWN_AREA_CODES[0].code, label: KNOWN_AREA_CODES[0].label, count: 10 })
  expect(entries[entries.length - 1].count).toBe(100 - KNOWN_AREA_CODES.length * 10)
})

it('fills every month from 1 to 12, zeroing the months the RPC left out', () => {
  const sparse = [{ month: 3, count: 7 }, { month: 11, count: 2 }]
  const dense = derive.buildBirthdayMonths(sparse)

  expect(dense).toHaveLength(12)
  expect(dense.map((entry) => entry.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  expect(dense[2]).toEqual({ month: 3, count: 7 })
  expect(dense[10]).toEqual({ month: 11, count: 2 })
  expect(dense[0]).toEqual({ month: 1, count: 0 })
})

it('builds the data-quality object with only missingEmail resolved', () => {
  const quality = derive.buildDataQuality(42)
  expect(quality).toEqual({
    missingEmail: 42,
    sharedPhone: null,
    sharedEmail: null,
    repeatedName: null,
    typoEmailDomain: null,
  })
})

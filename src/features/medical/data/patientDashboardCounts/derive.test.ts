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

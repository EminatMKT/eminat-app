import type { AreaCodeCount, BirthdayMonthCount, DataQualityCounts } from './types'
import {
  KNOWN_AREA_CODES,
  AREA_CODE_OTHER,
  LABEL_OTHER,
  DATE_PART_LENGTH,
  ZERO_PAD,
  MONTHS_IN_YEAR,
} from './constants'

// ISO (YYYY-MM-DD) local-calendar date `yearsAgo` years before `today` — a birth-date cutoff
// for an age bucket. Built from `today`'s own local year/month/day instead of round-tripping
// through `toISOString()`, which converts to UTC and can shift the date near midnight.
function cutoffIso(yearsAgo: number, today: Date): string {
  const year = today.getFullYear() - yearsAgo
  const month = String(today.getMonth() + 1).padStart(DATE_PART_LENGTH, ZERO_PAD)
  return `${year}-${month}-${String(today.getDate()).padStart(DATE_PART_LENGTH, ZERO_PAD)}`
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
  const otherEntry = { code: AREA_CODE_OTHER, label: LABEL_OTHER, count: totalPatients - knownTotal }
  entries.push(otherEntry)
  return entries
}

// Dense 1-12 month→count list — the RPC is sparse (a month with zero births is simply absent
// from its rows), so every month gets an explicit zero when the RPC didn't return it.
function buildBirthdayMonths(rows: BirthdayMonthCount[]): BirthdayMonthCount[] {
  const countByMonth = new Map(rows.map((row) => [row.month, row.count]))
  const months: BirthdayMonthCount[] = new Array(MONTHS_IN_YEAR)
  for (let month = 1; month <= MONTHS_IN_YEAR; month += 1) {
    months[month - 1] = { month, count: countByMonth.get(month) ?? 0 }
  }
  return months
}

// The data-quality counts object, kept here instead of built inline at the orchestrator's call
// site — the three fields with no DB aggregate yet stay `null` until one exists.
function buildDataQuality(missingEmail: number): DataQualityCounts {
  const dataQuality: DataQualityCounts = {
    missingEmail,
    sharedPhone: null,
    sharedEmail: null,
    repeatedName: null,
    typoEmailDomain: null,
  }
  return dataQuality
}

/** The pure derivation helpers the dashboard-counts orchestrator uses to shape raw counts. */
const derive = {
  cutoffIso,
  buildAreaCodeEntries,
  buildBirthdayMonths,
  buildDataQuality,
}

export default derive

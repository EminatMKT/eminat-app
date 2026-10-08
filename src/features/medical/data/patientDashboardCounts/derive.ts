import type { AreaCodeCount } from './types'
import { KNOWN_AREA_CODES, AREA_CODE_OTHER, LABEL_OTHER } from './constants'

const DATE_PART_LENGTH = 2
const ZERO_PAD = '0'

// ISO (YYYY-MM-DD) local-calendar date `yearsAgo` years before `today` — a birth-date cutoff
// for an age bucket. Built from `today`'s own local year/month/day instead of round-tripping
// through `toISOString()`, which converts to UTC and can shift the date near midnight.
function cutoffIso(yearsAgo: number, today: Date): string {
  const year = today.getFullYear() - yearsAgo
  const month = String(today.getMonth() + 1).padStart(DATE_PART_LENGTH, ZERO_PAD)
  const day = String(today.getDate()).padStart(DATE_PART_LENGTH, ZERO_PAD)
  const iso = `${year}-${month}-${day}`
  return iso
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

/** The pure derivation helpers the dashboard-counts orchestrator uses to shape raw counts. */
const derive = { cutoffIso, buildAreaCodeEntries }

export default derive

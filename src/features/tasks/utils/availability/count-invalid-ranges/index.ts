import type { RangeValidationError } from '../types'
import type { InvalidRangeCount } from './types'

/** Counts DISTINCT ranges flagged invalid, not raw error entries: one range can carry two errors
 *  (e.g. a reversed range that also overlaps another), and callers report "N ranges" once. */
export default function countInvalidRanges(errors: RangeValidationError[]): InvalidRangeCount {
  const invalidRangeIndexes = new Set(errors.map(error => error.rangeIndex))

  return invalidRangeIndexes.size
}

// This module turns a flat RangeValidationError list into the single number every validation
// banner (editor-wide or day-scoped) needs, so neither recomputes the same Set-based dedup.

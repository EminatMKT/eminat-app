import type { RangeValidationError, Weekday, WeeklyAvailabilityRange } from './types'
import minutesOf from './minutes'
import hasOverlap from './has-overlap'

type ParsedRange = {
  rangeIndex: number
  weekday: Weekday
  start: number | null
  end: number | null
}

/** Checks a week's ranges for malformed times, reversed or zero-duration spans, and same-weekday
 *  overlaps. Touching ranges — one ends exactly when the next starts — are not an overlap. */
export default function validateRanges(ranges: WeeklyAvailabilityRange[]): RangeValidationError[] {
  const errors: RangeValidationError[] = []
  const parsed: ParsedRange[] = ranges.map((range, rangeIndex) => {
    const parsedRange: ParsedRange = {
      rangeIndex,
      weekday: range.weekday,
      start: minutesOf(range.startsAt),
      end: minutesOf(range.endsAt),
    }
    return parsedRange
  })

  parsed.forEach(({ rangeIndex, start, end }) => {
    if (start === null || end === null) {
      const invalidTimeError: RangeValidationError = { code: 'invalid-time', rangeIndex }
      errors.push(invalidTimeError)
    } else if (end <= start) {
      const endNotAfterStartError: RangeValidationError = { code: 'end-not-after-start', rangeIndex }
      errors.push(endNotAfterStartError)
    }
  })

  for (let left = 0; left < parsed.length; left += 1) {
    for (let right = left + 1; right < parsed.length; right += 1) {
      if (hasOverlap(parsed[left], parsed[right])) {
        const overlapError: RangeValidationError = { code: 'overlap', rangeIndex: right, conflictingRangeIndex: left }
        errors.push(overlapError)
      }
    }
  }

  return errors
}

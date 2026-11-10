import type { RangeValidationError, WeeklyAvailabilityRange } from '../types'
import minutesOf from '../minutes'
import endMinutesOf from '../end-minutes-of'
import hasOverlap from '../has-overlap'
import type { MinutesSpan, ParsedRange } from './types'

function minutesSpan({ startsAt, endsAt }: WeeklyAvailabilityRange): MinutesSpan {
  const span: MinutesSpan = { start: minutesOf(startsAt), end: endMinutesOf(endsAt) }

  return span
}

function parseRange(range: WeeklyAvailabilityRange, rangeIndex: number): ParsedRange {
  const parsedRange: ParsedRange = { rangeIndex, weekday: range.weekday, ...minutesSpan(range) }

  return parsedRange
}

function spanErrors({ rangeIndex, start, end }: ParsedRange): RangeValidationError[] {
  const invalidTime: RangeValidationError = { code: 'invalid-time', rangeIndex }
  const endNotAfterStart: RangeValidationError = { code: 'end-not-after-start', rangeIndex }

  if (start === null || end === null) return [invalidTime]

  return end <= start ? [endNotAfterStart] : []
}

function overlapOf(left: ParsedRange, right: ParsedRange): RangeValidationError {
  const overlap: RangeValidationError = {
    code: 'overlap',
    rangeIndex: right.rangeIndex,
    conflictingRangeIndex: left.rangeIndex,
  }

  return overlap
}

function overlapsWithLater(left: ParsedRange, leftIndex: number, parsed: ParsedRange[]) {
  const colliding = parsed.slice(leftIndex + 1).filter(right => hasOverlap(left, right))
  const errors = colliding.map(right => overlapOf(left, right))

  return errors
}

/** Checks a week's ranges for malformed times, reversed or zero-duration spans, and same-weekday
 *  overlaps. Touching ranges — one ends exactly when the next starts — are not an overlap. */
export default function validateRanges(
  ranges: WeeklyAvailabilityRange[],
): RangeValidationError[] {
  const parsed = ranges.map(parseRange)
  const errors = [...parsed.flatMap(spanErrors), ...parsed.flatMap(overlapsWithLater)]

  return errors
}

// validateRanges parses every range to minutes once, reports each malformed or non-forward span
// in input order, then compares every range against each later one and reports the later range
// of each colliding pair as the overlap.

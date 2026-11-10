import type { ForwardSpan, OverlapCandidate } from './types'

function spanOf({ start, end }: OverlapCandidate): ForwardSpan | null {
  if (start === null || end === null || end <= start) return null

  const span: ForwardSpan = { start, end }

  return span
}

/** Whether two already-parsed ranges collide: same weekday, overlapping minutes. A malformed or
 *  zero/negative-length side never counts as an overlap — `validateRanges` reports those on its
 *  own. Touching ranges (one ends exactly when the other starts) do not collide either. */
export default function hasOverlap(a: OverlapCandidate, b: OverlapCandidate): boolean {
  const spanA = spanOf(a)
  const spanB = spanOf(b)

  if (a.weekday !== b.weekday || spanA === null || spanB === null) return false

  return spanA.start < spanB.end && spanB.start < spanA.end
}

// hasOverlap discards any side that is not a forward span, then applies the half-open interval
// test: two spans share minutes when each one starts before the other ends.

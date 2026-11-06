import buildRange from './build'
import commitRange from '../validate'
import type { CreateRangeInput } from './types'

/** Appends a draft only when the resulting complete week is valid. */
export default function createRange({ day, bounds, ranges }: CreateRangeInput) {
  const input = { day, bounds }
  const range = buildRange(input)
  const next = ranges.concat(range)

  return commitRange(next)
}

// Creation owns identity construction and the same whole-week gate used for edits.

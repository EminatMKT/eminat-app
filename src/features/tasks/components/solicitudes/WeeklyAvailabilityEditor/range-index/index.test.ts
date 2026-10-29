import { describe, expect, it } from 'vitest'
import type { EditableRange } from '../component-types'
import {
  RANGE_INDEX_NOT_FOUND,
} from './types'
import createRangeIndexFacade from './index'

const FIRST_INDEX = 0
const SECOND_INDEX = 1
const FIRST_CLIENT_ID = 'range-1'
const SECOND_CLIENT_ID = 'range-2'
const MISSING_CLIENT_ID = 'range-missing'
const MONDAY = 1
const RANGES: EditableRange[] = [
  {
    id: FIRST_CLIENT_ID,
    clientId: FIRST_CLIENT_ID,
    weekday: MONDAY,
    startsAt: '09:00',
    endsAt: '12:00',
    note: null,
  },
  {
    id: SECOND_CLIENT_ID,
    clientId: SECOND_CLIENT_ID,
    weekday: MONDAY,
    startsAt: '13:00',
    endsAt: '17:00',
    note: 'focus',
  },
]

const { resolveRangeIndex } = createRangeIndexFacade()

describe('WeeklyAvailabilityEditor range index', () => {
  it('resolves the current index by client id without mutating ranges', () => {
    const originalRanges = [...RANGES]

    const index = resolveRangeIndex({
      ranges: RANGES,
      clientId: SECOND_CLIENT_ID,
    })

    expect(index).toBe(SECOND_INDEX)
    expect(RANGES).toEqual(originalRanges)
  })

  it('returns the named not-found value for an unknown client id', () => {
    const index = resolveRangeIndex({
      ranges: RANGES,
      clientId: MISSING_CLIENT_ID,
    })

    expect(index).toBe(RANGE_INDEX_NOT_FOUND)
  })

  it('tracks the first range at its current index', () => {
    const index = resolveRangeIndex({
      ranges: RANGES,
      clientId: FIRST_CLIENT_ID,
    })

    expect(index).toBe(FIRST_INDEX)
  })
})

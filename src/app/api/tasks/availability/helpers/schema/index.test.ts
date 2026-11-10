import { describe, expect, it } from 'vitest'
import saveSchema from '.'

const validRange = { weekday: 1, startsAt: '09:00', endsAt: '12:00' }

describe('saveSchema', () => {
  it('accepts a well-formed range list', () => {
    const validBody = { ranges: [validRange] }

    expect(saveSchema.safeParse(validBody).success).toBe(true)
  })

  it('rejects a body without ranges', () => {
    const emptyBody = {}

    expect(saveSchema.safeParse(emptyBody).success).toBe(false)
  })

  it('rejects an out-of-range weekday', () => {
    const outOfRangeWeekday = { ...validRange, weekday: 8 }
    const invalidBody = { ranges: [outOfRangeWeekday] }

    expect(saveSchema.safeParse(invalidBody).success).toBe(false)
  })

  it('rejects a non-canonical time string', () => {
    const nonCanonicalTime = { ...validRange, startsAt: '9:00' }
    const invalidBody = { ranges: [nonCanonicalTime] }

    expect(saveSchema.safeParse(invalidBody).success).toBe(false)
  })

  it('rejects a note past the column limit', () => {
    const tooLongNote = { ...validRange, note: 'x'.repeat(NOTE_OVER_LIMIT) }
    const invalidBody = { ranges: [tooLongNote] }

    expect(saveSchema.safeParse(invalidBody).success).toBe(false)
  })

  it('rejects an unknown field, including a target user id', () => {
    const invalidBody = { ranges: [validRange], userId: 'someone-else' }

    expect(saveSchema.safeParse(invalidBody).success).toBe(false)
  })

  it('rejects more than the transport cap of ranges', () => {
    const arrayLikeLength = { length: RANGES_OVER_CAP }
    const tooMany = Array.from(arrayLikeLength, () => validRange)
    const invalidBody = { ranges: tooMany }

    expect(saveSchema.safeParse(invalidBody).success).toBe(false)
  })
})

const NOTE_OVER_LIMIT = 281
const RANGES_OVER_CAP = 71

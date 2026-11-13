import { describe, expect, it } from 'vitest'
import { END_OF_DAY_TIME } from '@/features/tasks/utils/availability/constants'
import saveSchema from '.'

const validRange = { weekday: 1, startsAt: '23:30', endsAt: '23:59' }
const invalidEnd = '24:01'

describe('saveSchema end-of-day boundary', () => {
  it('accepts canonical midnight only at the end', () => {
    const range = { ...validRange, endsAt: END_OF_DAY_TIME }
    const body = { ranges: [range] }

    expect(saveSchema.safeParse(body).success).toBe(true)
  })

  it('rejects midnight at the start', () => {
    const range = { ...validRange, startsAt: END_OF_DAY_TIME }
    const body = { ranges: [range] }

    expect(saveSchema.safeParse(body).success).toBe(false)
  })

  it('rejects a non-canonical end after midnight', () => {
    const range = { ...validRange, endsAt: invalidEnd }
    const body = { ranges: [range] }

    expect(saveSchema.safeParse(body).success).toBe(false)
  })
})

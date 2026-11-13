import { describe, expect, it } from 'vitest'
import { END_OF_DAY_TIME } from '../constants'
import endMinutesOf from '.'

const afterEndOfDay = '24:01'
const ordinaryEnd = '23:30'

describe('endMinutesOf', () => {
  it('parses midnight only as the end of a day', () => {
    expect(endMinutesOf(END_OF_DAY_TIME)).toBe(1440)
    expect(endMinutesOf(afterEndOfDay)).toBeNull()
    expect(endMinutesOf(ordinaryEnd)).toBe(1410)
  })
})
